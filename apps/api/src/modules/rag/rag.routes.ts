import type { FastifyPluginAsync } from 'fastify';
import {
  ragQuerySchema,
  ragDiagnosticsSchema,
  resolveCitationSchema,
  type ApiResponse,
  type RagQueryResult,
  type RagDiagnosticInfo,
} from '@omnitutor/shared';
import type { RagService } from './rag.service.js';

export function createRagRoutes(deps: { ragService: RagService }): FastifyPluginAsync {
  const { ragService } = deps;

  return async (app) => {
    // 1. Course-scoped RAG Query
    app.post<{
      Params: { courseId: string };
      Body: unknown;
      Reply: ApiResponse<RagQueryResult>;
    }>(
      '/courses/:courseId/rag/query',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const parsed = ragQuerySchema.parse(req.body);

        const result = await ragService.executeQuery(
          {
            ...parsed,
            courseId,
          },
          String(req.user!._id),
          req.user!.role
        );

        return reply.status(200).send({
          success: true,
          data: result,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 2. Retrieval Diagnostics (Admin or Course Owner)
    app.post<{
      Params: { courseId: string };
      Body: unknown;
      Reply: ApiResponse<RagDiagnosticInfo>;
    }>(
      '/courses/:courseId/rag/diagnostics',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const parsed = ragDiagnosticsSchema.parse(req.body);

        const diagnostics = await ragService.getDiagnostics(
          {
            ...parsed,
            courseId,
          },
          String(req.user!._id),
          req.user!.role
        );

        return reply.status(200).send({
          success: true,
          data: diagnostics,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 3. Source Chunk Lookup
    app.get<{
      Params: { courseId: string; chunkId: string };
      Reply: ApiResponse<any>;
    }>(
      '/courses/:courseId/rag/sources/:chunkId',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId, chunkId } = req.params;
        await ragService.verifyCourseAccess(courseId, String(req.user!._id), req.user!.role);

        const resolved = await ragService.resolveChunkSource(chunkId, courseId);

        return reply.status(200).send({
          success: true,
          data: resolved,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 4. Citation Resolver
    app.post<{
      Body: unknown;
      Reply: ApiResponse<any>;
    }>(
      '/rag/citations/resolve',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const parsed = resolveCitationSchema.parse(req.body);
        const resolved = await ragService.resolveChunkSource(parsed.chunkId);

        return reply.status(200).send({
          success: true,
          data: resolved,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );
  };
}
