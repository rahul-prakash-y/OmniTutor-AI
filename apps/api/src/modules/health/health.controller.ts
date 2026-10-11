import type { FastifyReply, FastifyRequest } from 'fastify';
import { HealthService } from './health.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class HealthController {
  private healthService: HealthService;

  constructor(healthService?: HealthService) {
    this.healthService = healthService || new HealthService();
  }

  public getHealth = async (_request: FastifyRequest, reply: FastifyReply) => {
    const healthData = await this.healthService.getHealth();
    const statusCode = healthData.status === 'unhealthy' ? 503 : 200;
    return sendSuccess(reply, healthData, statusCode);
  };

  public getReady = async (_request: FastifyRequest, reply: FastifyReply) => {
    const readyData = await this.healthService.getReadiness();
    const statusCode = readyData.ready ? 200 : 503;
    return sendSuccess(reply, readyData, statusCode);
  };
}
