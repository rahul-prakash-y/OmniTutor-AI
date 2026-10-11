import type { FastifyPluginAsync } from 'fastify';
import {
  type ApiResponse,
  type IngestionJob,
} from '@omnitutor/shared';
import { IngestionService } from './ingestion.service.js';
import type { IngestionQueueService } from './queue.service.js';

export interface IngestionRouteOptions {
  ingestionService: IngestionService;
  queueService?: IngestionQueueService;
}

export function createIngestionRoutes(options: IngestionRouteOptions): FastifyPluginAsync {
  const { ingestionService, queueService } = options;

  return async (fastify) => {
    /**
     * GET /ingestion/jobs/:jobId - Poll job status, progress, stage, error
     */
    fastify.get<{ Params: { jobId: string } }>(
      '/ingestion/jobs/:jobId',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const job = await ingestionService.getJobStatus(
          request.params.jobId,
          String(request.user!._id)
        );

        const response: ApiResponse<IngestionJob> = {
          success: true,
          data: job,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * GET /courses/:courseId/ingestion-status - Get all ingestion jobs for course
     */
    fastify.get<{ Params: { courseId: string } }>(
      '/courses/:courseId/ingestion-status',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const jobs = await ingestionService.getCourseIngestionStatus(
          request.params.courseId,
          String(request.user!._id)
        );

        const response: ApiResponse<IngestionJob[]> = {
          success: true,
          data: jobs,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * GET /courses/:courseId/materials/:materialId/preview - Preview extracted content
     */
    fastify.get<{ Params: { courseId: string; materialId: string } }>(
      '/courses/:courseId/materials/:materialId/preview',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const preview = await ingestionService.getMaterialPreview(
          request.params.courseId,
          request.params.materialId,
          String(request.user!._id)
        );

        const response: ApiResponse<typeof preview> = {
          success: true,
          data: preview,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * POST /ingestion/jobs/:jobId/cancel - Cancel pending ingestion job
     */
    fastify.post<{ Params: { jobId: string } }>(
      '/ingestion/jobs/:jobId/cancel',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        const cancelled = queueService
          ? await queueService.cancel(request.params.jobId)
          : false;

        const response: ApiResponse<{ cancelled: boolean }> = {
          success: true,
          data: { cancelled },
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );
  };
}
