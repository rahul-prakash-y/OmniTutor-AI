import type {
  CompletionMessage,
  CompletionOptions,
  CompletionResult,
  ServiceHealthStatus,
} from '@omnitutor/shared';

export interface StreamChunkResult {
  text: string;
  isComplete: boolean;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  checkHealth(): Promise<ServiceHealthStatus>;
  generateCompletion(
    messages: CompletionMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult>;
  generateCompletionStream(
    messages: CompletionMessage[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunkResult>;
}

