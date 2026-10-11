import type {
  HealthCheckData,
  ReadinessCheckData,
  ServiceHealthStatus,
} from '@omnitutor/shared';
import { checkDatabaseLatency, isDatabaseConnected } from '../../database/connection.js';
import { getAIProvider, type IAIProvider } from '../../services/ai/index.js';
import { getVectorService, type IVectorService } from '../../services/vector/index.js';
import { env } from '../../config/env.js';

export class HealthService {
  private readonly aiProvider: IAIProvider;
  private readonly vectorService: IVectorService;
  private readonly startTime: number;

  constructor(aiProvider?: IAIProvider, vectorService?: IVectorService) {
    this.aiProvider = getAIProvider(aiProvider);
    this.vectorService = getVectorService(vectorService);
    this.startTime = Date.now();
  }

  public async getHealth(): Promise<HealthCheckData> {
    const dbCheck = await checkDatabaseLatency();
    const dbStatus: ServiceHealthStatus = dbCheck.connected
      ? { status: 'healthy', latencyMs: dbCheck.latencyMs, message: 'MongoDB connection active' }
      : { status: 'degraded', message: 'MongoDB is disconnected or unreachable' };

    const vectorStatus = await this.vectorService.checkHealth();
    const aiStatus = await this.aiProvider.checkHealth();

    // Overall status: unhealthy if DB is down; degraded if AI or vector is down; healthy if all ok
    let overallStatus: HealthCheckData['status'] = 'healthy';
    if (dbStatus.status === 'unhealthy' || vectorStatus.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (
      dbStatus.status === 'degraded' ||
      vectorStatus.status === 'degraded' ||
      aiStatus.status === 'degraded'
    ) {
      overallStatus = 'degraded';
    }

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: overallStatus,
      uptimeSeconds,
      environment: env.NODE_ENV,
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        vectorStore: vectorStatus,
        aiProvider: aiStatus,
      },
    };
  }

  public async getReadiness(): Promise<ReadinessCheckData> {
    const isDbReady = isDatabaseConnected();
    const vectorHealth = await this.vectorService.checkHealth();
    const isVectorReady = vectorHealth.status === 'healthy';

    return {
      ready: isDbReady && isVectorReady,
      services: {
        database: isDbReady,
        vectorStore: isVectorReady,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
