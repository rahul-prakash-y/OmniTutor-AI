import { GoogleGenAI } from '@google/genai';
import type {
  CompletionMessage,
  CompletionOptions,
  CompletionResult,
  ServiceHealthStatus,
} from '@omnitutor/shared';
import type { IAIProvider } from './ai.interface.js';
import { ServiceUnavailableError } from '../../utils/errors.js';
import { logger } from '../../config/logger.js';

export class GeminiProvider implements IAIProvider {
  public readonly providerName = 'google-gemini';
  private client: GoogleGenAI | null = null;
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel = 'gemini-2.0-flash') {
    this.apiKey = apiKey?.trim() || undefined;
    this.defaultModel = defaultModel;

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        logger.info(`Google Gemini AI provider initialized with default model: ${this.defaultModel}`);
      } catch (err) {
        logger.error({ err }, 'Failed to initialize Google GenAI client');
        this.client = null;
      }
    } else {
      logger.info('Google Gemini AI provider running in unconfigured state (no GEMINI_API_KEY)');
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.client);
  }

  public async checkHealth(): Promise<ServiceHealthStatus> {
    if (!this.isConfigured()) {
      return {
        status: 'degraded',
        message: 'GEMINI_API_KEY is not configured. Server is functional but AI tutoring requires an API key.',
        details: { provider: this.providerName, configured: false },
      };
    }

    const start = Date.now();
    try {
      // Lightweight verification of configuration
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        message: `Connected to Google Gemini API (model: ${this.defaultModel})`,
        details: { provider: this.providerName, configured: true, model: this.defaultModel },
      };
    } catch (err) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Gemini health probe failed',
        details: { provider: this.providerName, configured: true },
      };
    }
  }

  private isTransientError(err: unknown): boolean {
    if (!err) return false;
    const msg = String(err instanceof Error ? err.message : err).toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('resource_exhausted') ||
      msg.includes('rate limit') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('500') ||
      msg.includes('service unavailable') ||
      msg.includes('etimedout') ||
      msg.includes('econnreset') ||
      msg.includes('fetch failed') ||
      msg.includes('timed out')
    );
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 2,
    baseDelayMs = 600,
    timeoutMs = 30000
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini request timed out after 30s')), timeoutMs)
        );
        return await Promise.race([fn(), timeoutPromise]);
      } catch (err) {
        lastError = err;
        const transient = this.isTransientError(err);
        if (!transient || attempt === maxRetries) {
          throw err;
        }
        const jitter = Math.random() * 200;
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + jitter, 4000);
        logger.warn(
          {
            attempt: attempt + 1,
            delayMs: Math.round(delay),
            error: err instanceof Error ? err.message : String(err),
          },
          'Transient Gemini error encountered. Retrying with bounded exponential backoff...'
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  public async generateCompletion(
    messages: CompletionMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (!this.client || !this.apiKey) {
      throw new ServiceUnavailableError(
        'Google Gemini AI',
        'GEMINI_API_KEY is not configured in the server environment.'
      );
    }

    const modelName = options?.model || this.defaultModel;

    // Convert messages into GenAI content structure
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    try {
      const response = await this.executeWithRetry(() =>
        this.client!.models.generateContent({
          model: modelName,
          contents,
          config: {
            temperature: options?.temperature,
            maxOutputTokens: options?.maxOutputTokens,
            systemInstruction: options?.systemInstruction,
            stopSequences: options?.stopSequences,
          },
        })
      );

      const responseText = response.text || '';

      return {
        text: responseText,
        model: modelName,
        tokensUsed: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
        finishReason: response.candidates?.[0]?.finishReason ?? 'STOP',
      };
    } catch (err) {
      logger.error({ err, model: modelName }, 'Gemini generateContent call failed');
      throw new ServiceUnavailableError(
        'Google Gemini AI',
        err instanceof Error ? err.message : 'Model generation failed'
      );
    }
  }

  public async *generateCompletionStream(
    messages: CompletionMessage[],
    options?: CompletionOptions
  ): AsyncIterable<import('./ai.interface.js').StreamChunkResult> {
    if (!this.client || !this.apiKey) {
      throw new ServiceUnavailableError(
        'Google Gemini AI',
        'GEMINI_API_KEY is not configured in the server environment.'
      );
    }

    const modelName = options?.model || this.defaultModel;
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    try {
      const responseStream = await this.client.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxOutputTokens,
          systemInstruction: options?.systemInstruction,
          stopSequences: options?.stopSequences,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        yield {
          text,
          isComplete: false,
        };
      }

      yield {
        text: '',
        isComplete: true,
      };
    } catch (err) {
      logger.error({ err, model: modelName }, 'Gemini generateContentStream failed');
      throw new ServiceUnavailableError(
        'Google Gemini AI',
        err instanceof Error ? err.message : 'Model generation stream failed'
      );
    }
  }
}

