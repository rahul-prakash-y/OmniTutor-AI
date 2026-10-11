import crypto from 'node:crypto';
import type { IEmbeddingProvider } from './embedding.interface.js';

export class MockEmbeddingProvider implements IEmbeddingProvider {
  public readonly providerName = 'mock-embedding';
  public readonly dimensions: number;

  constructor(dimensions = 768) {
    this.dimensions = dimensions;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    // Generate deterministic pseudo-random vector from SHA-256 hash of text
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector = new Array<number>(this.dimensions);

    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      // Derive pseudo-random float between -1 and 1
      const byte1 = hash[i % hash.length]!;
      const byte2 = hash[(i * 7 + 13) % hash.length]!;
      const val = ((byte1 ^ byte2) / 128.0) - 1.0;
      vector[i] = val;
      norm += val * val;
    }

    // Normalize to unit length
    const magnitude = Math.sqrt(norm) || 1.0;
    for (let i = 0; i < this.dimensions; i++) {
      vector[i] = Number((vector[i]! / magnitude).toFixed(6));
    }

    return vector;
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }
}
