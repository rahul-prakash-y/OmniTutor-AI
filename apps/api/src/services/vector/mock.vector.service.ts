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
    // Replace if same id, else append
    const existingIds = new Set(points.map((p) => p.id));
    const filtered = existing.filter((p) => !existingIds.has(p.id));
    this.pointsMap.set(collection, [...filtered, ...points]);
    return true;
  }

  public async search(
    collection: string,
    _vector: number[],
    limit = 5,
    filter?: Record<string, unknown>
  ): Promise<VectorSearchResult[]> {
    let points = this.pointsMap.get(collection) || [];

    if (filter) {
      points = points.filter((p) => {
        if (!p.payload) return false;
        return Object.entries(filter).every(([k, v]) => p.payload?.[k] === v);
      });
    }

    return points.slice(0, limit).map((p, idx) => ({
      id: p.id,
      score: 0.99 - idx * 0.05,
      payload: p.payload || {},
    }));
  }

  public async deletePointsByFilter(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<boolean> {
    const points = this.pointsMap.get(collection) || [];
    const remaining = points.filter((p) => {
      if (!p.payload) return true;
      // If matches filter, remove it
      const matches = Object.entries(filter).every(([k, v]) => p.payload?.[k] === v);
      return !matches;
    });
    this.pointsMap.set(collection, remaining);
    return true;
  }

  public async deletePoints(
    collection: string,
    ids: Array<string | number>
  ): Promise<boolean> {
    const idSet = new Set(ids);
    const points = this.pointsMap.get(collection) || [];
    const remaining = points.filter((p) => !idSet.has(p.id));
    this.pointsMap.set(collection, remaining);
    return true;
  }

  public getStoredPoints(collection: string): VectorPoint[] {
    return this.pointsMap.get(collection) || [];
  }
}
