import type { ServiceHealthStatus, VectorSearchResult } from '@omnitutor/shared';

export interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface IVectorService {
  readonly serviceName: string;
  checkHealth(): Promise<ServiceHealthStatus>;
  createCollectionIfNotExists(name: string, vectorSize?: number): Promise<boolean>;
  upsertPoints(collection: string, points: VectorPoint[]): Promise<boolean>;
  search(
    collection: string,
    vector: number[],
    limit?: number,
    filter?: Record<string, unknown>
  ): Promise<VectorSearchResult[]>;
  deletePointsByFilter(collection: string, filter: Record<string, unknown>): Promise<boolean>;
  deletePoints(collection: string, ids: Array<string | number>): Promise<boolean>;
}
