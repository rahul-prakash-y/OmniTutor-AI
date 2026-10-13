import type {
  CompletionMessage,
  CompletionOptions,
  CompletionResult,
  ServiceHealthStatus,
} from '@omnitutor/shared';
import type { IAIProvider } from './ai.interface.js';

export class MockAIProvider implements IAIProvider {
  public readonly providerName = 'mock-ai-provider';
  private shouldFail = false;
  private customResponse?: string;

  constructor(options?: { shouldFail?: boolean; customResponse?: string }) {
    this.shouldFail = options?.shouldFail ?? false;
    this.customResponse = options?.customResponse;
  }

  public isConfigured(): boolean {
    return true;
  }

  public async checkHealth(): Promise<ServiceHealthStatus> {
    if (this.shouldFail) {
      return {
        status: 'unhealthy',
        latencyMs: 5,
        message: 'Mock AI provider failure simulation',
      };
    }

    return {
      status: 'healthy',
      latencyMs: 2,
      message: 'Mock AI provider operational',
      details: { provider: this.providerName },
    };
  }

  public setCustomResponse(response: string): void {
    this.customResponse = response;
  }

  public setResponse(response: string): void {
    this.customResponse = response;
  }

  public setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  public async generateCompletion(
    messages: CompletionMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (this.shouldFail) {
      throw new Error('Simulated AI provider error');
    }

    const lastMessage = messages[messages.length - 1]?.content ?? '';
    const text =
      this.customResponse ??
      `[OmniTutor Mock Tutor] Thank you for your question about: "${lastMessage}". Let us explore this step by step.`;

    return {
      text,
      model: options?.model || 'mock-omnitutor-v1',
      tokensUsed: {
        promptTokens: 12,
        completionTokens: 25,
        totalTokens: 37,
      },
      finishReason: 'STOP',
    };
  }

  public async *generateCompletionStream(
    messages: CompletionMessage[],
    _options?: CompletionOptions
  ): AsyncIterable<import('./ai.interface.js').StreamChunkResult> {
    if (this.shouldFail) {
      throw new Error('Simulated AI provider error in stream');
    }

    const lastMessage = messages[messages.length - 1]?.content ?? '';
    const text =
      this.customResponse ??
      `[OmniTutor Mock Tutor] Thank you for your question about: "${lastMessage}". Let us explore this step by step.`;

    // Stream out words with simulated tokens
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const piece = words[i] + (i === words.length - 1 ? '' : ' ');
      yield {
        text: piece,
        isComplete: false,
      };
    }

    yield {
      text: '',
      isComplete: true,
      tokensUsed: {
        promptTokens: 12,
        completionTokens: words.length,
        totalTokens: 12 + words.length,
      },
    };
  }
}

