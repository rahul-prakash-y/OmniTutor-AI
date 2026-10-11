import type { ServiceHealthStatus, VectorSearchResult } from '@omnitutor/shared';
import type { IVectorService, VectorPoint } from './vector.interface.js';

export class MockVectorService implements IVectorService {
  public readonly serviceName = 'mock-vector-service';
  private collections = new Set<string>();
  private pointsMap = new Map<string, VectorPoint[]>();
  private shouldFail = false;

  constructor(options?: { shouldFail?: boolean }) {
    this.shouldFail = options?.shouldFail ?? false;
  }

  public async checkHealth(): Promise<ServiceHealthStatus> {
    if (this.shouldFail) {
      return {
        status: 'unhealthy',
        latencyMs: 5,
        message: 'Mock vector store failure simulation',
      };
    }

    return {
      status: 'healthy',
      latencyMs: 1,
      message: 'Mock vector store operational',
      details: { service: this.serviceName, collections: this.collections.size },
    };
  }

  public async createCollectionIfNotExists(name: string): Promise<boolean> {
    this.collections.add(name);
    if (!this.pointsMap.has(name)) {
      this.pointsMap.set(name, []);
    }
    return true;
  }

  public async upsertPoints(
    collection: string,
    points: VectorPoint[]
  ): Promise<boolean> {
    const existing = this.pointsMap.get(collection) || [];
    this.pointsMap.set(collection, [...existing, ...points]);
    return true;
  }

  public async search(
    collection: string,
    _vector: number[],
    limit = 5
  ): Promise<VectorSearchResult[]> {
    const points = this.pointsMap.get(collection) || [];
    return points.slice(0, limit).map((p, idx) => ({
      id: p.id,
      score: 0.99 - idx * 0.05,
      payload: p.payload || {},
    }));
  }
}
