import { GoogleGenAI } from '@google/genai';
import type { IEmbeddingProvider } from './embedding.interface.js';
import { MockEmbeddingProvider } from './mock.embedding.provider.js';
import { logger } from '../../config/logger.js';

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  public readonly providerName = 'gemini-embedding';
  public readonly dimensions = 768;
  private client: GoogleGenAI | null = null;
  private readonly fallbackProvider: MockEmbeddingProvider;
  private readonly model: string;

  constructor(apiKey?: string, model = 'text-embedding-004') {
    this.fallbackProvider = new MockEmbeddingProvider(this.dimensions);
    this.model = model;

    if (apiKey?.trim()) {
      try {
        this.client = new GoogleGenAI({ apiKey: apiKey.trim() });
        logger.info(`Gemini Embedding Provider initialized with model: ${this.model}`);
      } catch (err) {
        logger.warn({ err }, 'Failed to initialize Google GenAI embedding client');
        this.client = null;
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.client);
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      return this.fallbackProvider.generateEmbedding(text);
    }

    try {
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: text,
      });

      const list = response.embeddings;
      if (list && list.length > 0 && list[0]?.values && list[0].values.length > 0) {
        return list[0].values;
      }

      logger.warn('Empty embedding returned from Gemini API, falling back to mock');
      return this.fallbackProvider.generateEmbedding(text);
    } catch (err) {
      logger.warn({ err }, 'Gemini embedding API call failed, falling back to mock');
      return this.fallbackProvider.generateEmbedding(text);
    }
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Process in batches of 10 to avoid rate limits
    const results: number[][] = [];
    const batchSize = 10;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(batch.map((t) => this.generateEmbedding(t)));
      results.push(...batchEmbeddings);
    }

    return results;
  }
}
