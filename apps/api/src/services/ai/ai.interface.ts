import type {
  CompletionMessage,
  CompletionOptions,
  CompletionResult,
  ServiceHealthStatus,
} from '@omnitutor/shared';

export interface IAIProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  checkHealth(): Promise<ServiceHealthStatus>;
  generateCompletion(
    messages: CompletionMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult>;
}
