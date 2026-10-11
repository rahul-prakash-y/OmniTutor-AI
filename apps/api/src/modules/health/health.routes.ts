import type { FastifyPluginAsync } from 'fastify';
import { HealthController } from './health.controller.js';
import type { HealthService } from './health.service.js';

export interface HealthRouteOptions {
  healthService?: HealthService;
}

export const createHealthRoutes = (options?: HealthRouteOptions): FastifyPluginAsync => {
  return async (fastify) => {
    const controller = new HealthController(options?.healthService);

    fastify.get('/health', controller.getHealth);
    fastify.get('/ready', controller.getReady);
  };
};

export const healthRoutes = createHealthRoutes();
