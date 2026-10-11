import type { FastifyPluginAsync } from 'fastify';
import {
  recordRecentMaterialSchema,
  type ApiResponse,
  type MaterialContentDetails,
  type RecentMaterial,
} from '@omnitutor/shared';
import type { MaterialViewerService } from './material-viewer.service.js';

export function createMaterialViewerRoutes(deps: {
  materialViewerService: MaterialViewerService;
}): FastifyPluginAsync {
  const { materialViewerService } = deps;

  return async (app) => {
    // 1. Get structured viewer content for material
    app.get<{
      Params: { id: string };
      Reply: ApiResponse<MaterialContentDetails>;
    }>(
      '/materials/:id/viewer-content',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const details = await materialViewerService.getViewerContent(
          String(req.user!._id),
          req.user!.role,
          req.params.id
        );

        return reply.send({
          success: true,
          data: details,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 2. Record recent view position
    app.post<{
      Params: { id: string };
      Body: unknown;
      Reply: ApiResponse<RecentMaterial>;
    }>(
      '/materials/:id/recent',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const parsed = recordRecentMaterialSchema.parse(req.body || {});
        const recent = await materialViewerService.recordRecentView(
          String(req.user!._id),
          req.params.id,
          parsed.lastPosition
        );

        return reply.send({
          success: true,
          data: recent,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 3. List student's recently viewed materials
    app.get<{
      Querystring: { limit?: string };
      Reply: ApiResponse<RecentMaterial[]>;
    }>(
      '/materials/recent',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const list = await materialViewerService.listRecentMaterials(
          String(req.user!._id),
          limit
        );

        return reply.send({
          success: true,
          data: list,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );
  };
}
