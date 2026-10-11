export type AIProviderType = 'gemini' | 'mock' | 'custom';

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  stopSequences?: string[];
}

export interface CompletionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionResult {
  text: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export interface VectorEmbeddingResult {
  vector: number[];
  dimensions: number;
}

export interface VectorSearchResult {
  id: string | number;
  score: number;
  payload: Record<string, unknown>;
}
