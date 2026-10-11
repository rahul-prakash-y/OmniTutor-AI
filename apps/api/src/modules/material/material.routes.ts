import type { FastifyPluginAsync } from 'fastify';
import {
  type ApiResponse,
  type IngestionJob,
  type Material,
} from '@omnitutor/shared';
import { MaterialService } from './material.service.js';
import { BadRequestError } from '../../utils/errors.js';

export interface MaterialRouteOptions {
  materialService: MaterialService;
}

export function createMaterialRoutes(options: MaterialRouteOptions): FastifyPluginAsync {
  const { materialService } = options;

  return async (fastify) => {
    /**
     * POST /courses/:courseId/materials/upload - Stream file upload
     * Supports both multipart/form-data and JSON base64 uploads
     */
    fastify.post<{
      Params: { courseId: string };
      Body: { filename?: string; contentBase64?: string; mimeType?: string };
    }>(
      '/courses/:courseId/materials/upload',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        let buffer: Buffer;
        let filename: string;
        let declaredMimeType: string | undefined;

        const contentType = request.headers['content-type'] || '';

        if (contentType.includes('multipart/form-data')) {
          const fileData = await request.file();
          if (!fileData) {
            throw new BadRequestError('No file provided in multipart request');
          }
          buffer = await fileData.toBuffer();
          filename = fileData.filename;
          declaredMimeType = fileData.mimetype;
        } else if (request.body?.contentBase64 && request.body.filename) {
          // JSON payload upload for API / tests / direct buffers
          filename = request.body.filename;
          declaredMimeType = request.body.mimeType;
          buffer = Buffer.from(request.body.contentBase64, 'base64');
        } else {
          throw new BadRequestError(
            'Invalid upload request: expected multipart/form-data file or JSON contentBase64 payload'
          );
        }

        const result = await materialService.uploadMaterial({
          courseId: request.params.courseId,
          userId: String(request.user!._id),
          originalFilename: filename,
          buffer,
          declaredMimeType,
        });

        const response: ApiResponse<{ material: Material; job: IngestionJob }> = {
          success: true,
          data: result,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.status(202).send(response);
      }
    );

    /**
     * GET /courses/:courseId/materials - List materials in course library
     */
    fastify.get<{ Params: { courseId: string } }>(
      '/courses/:courseId/materials',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const materials = await materialService.getMaterials(
          request.params.courseId,
          String(request.user!._id)
        );

        const response: ApiResponse<Material[]> = {
          success: true,
          data: materials,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * GET /courses/:courseId/materials/:materialId - Get single material metadata
     */
    fastify.get<{ Params: { courseId: string; materialId: string } }>(
      '/courses/:courseId/materials/:materialId',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const material = await materialService.getMaterialById(
          request.params.courseId,
          request.params.materialId,
          String(request.user!._id)
        );

        const response: ApiResponse<Material> = {
          success: true,
          data: material,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * DELETE /courses/:courseId/materials/:materialId - Delete material & vectors
     */
    fastify.delete<{ Params: { courseId: string; materialId: string } }>(
      '/courses/:courseId/materials/:materialId',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        await materialService.deleteMaterial(
          request.params.courseId,
          request.params.materialId,
          String(request.user!._id)
        );

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: 'Material and all indexed vectors deleted successfully.' },
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * POST /courses/:courseId/materials/:materialId/retry - Retry failed ingestion
     */
    fastify.post<{ Params: { courseId: string; materialId: string } }>(
      '/courses/:courseId/materials/:materialId/retry',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        const job = await materialService.retryIngestion(
          request.params.courseId,
          request.params.materialId,
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

        return reply.status(202).send(response);
      }
    );
  };
}
