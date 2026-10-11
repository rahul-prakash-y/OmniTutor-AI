import { QdrantClient } from '@qdrant/js-client-rest';
import type { ServiceHealthStatus, VectorSearchResult } from '@omnitutor/shared';
import type { IVectorService, VectorPoint } from './vector.interface.js';
import { logger } from '../../config/logger.js';

export class QdrantService implements IVectorService {
  public readonly serviceName = 'qdrant';
  private client: QdrantClient;
  private readonly url: string;

  constructor(url: string, apiKey?: string) {
    this.url = url;
    this.client = new QdrantClient({
      url,
      apiKey: apiKey?.trim() || undefined,
      checkCompatibility: false,
      timeout: 3000,
    });
    logger.info(`Qdrant client configured for URL: ${url}`);
  }

  public async checkHealth(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      // Check cluster status or collections
      const collections = await this.client.getCollections();
      const latencyMs = Date.now() - start;

      return {
        status: 'healthy',
        latencyMs,
        message: `Qdrant vector store online (${collections.collections.length} collections)`,
        details: {
          url: this.url,
          collectionCount: collections.collections.length,
        },
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const message = err instanceof Error ? err.message : 'Connection failed';
      logger.warn({ err, url: this.url }, 'Qdrant health check failed');

      return {
        status: 'degraded',
        latencyMs,
        message: `Qdrant vector store unavailable: ${message}. Vector search is disabled until Qdrant is started.`,
        details: { url: this.url },
      };
    }
  }

  public async createCollectionIfNotExists(
    name: string,
    vectorSize = 1536
  ): Promise<boolean> {
    try {
      const exists = await this.client.collectionExists(name);
      if (!exists.exists) {
        await this.client.createCollection(name, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
        });
        logger.info(`Created Qdrant collection: ${name}`);
      }
      return true;
    } catch (err) {
      logger.error({ err, collection: name }, 'Failed to create Qdrant collection');
      return false;
    }
  }

  public async upsertPoints(
    collection: string,
    points: VectorPoint[]
  ): Promise<boolean> {
    try {
      await this.client.upsert(collection, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
      return true;
    } catch (err) {
      logger.error({ err, collection }, 'Failed to upsert points into Qdrant');
      return false;
    }
  }

  public async search(
    collection: string,
    vector: number[],
    limit = 5
  ): Promise<VectorSearchResult[]> {
    try {
      const results = await this.client.query(collection, {
        query: vector,
        limit,
        with_payload: true,
      });

      return results.points.map((r) => ({
        id: r.id,
        score: r.score,
        payload: (r.payload as Record<string, unknown>) ?? {},
      }));
    } catch (err) {
      logger.error({ err, collection }, 'Failed to search Qdrant vector store');
      return [];
    }
  }
}
