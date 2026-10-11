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
}
