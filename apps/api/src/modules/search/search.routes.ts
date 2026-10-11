import type { FastifyPluginAsync } from 'fastify';
import {
  globalSearchQuerySchema,
  type ApiResponse,
  type GlobalSearchResponse,
} from '@omnitutor/shared';
import type { SearchService } from './search.service.js';

export function createSearchRoutes(deps: {
  searchService: SearchService;
}): FastifyPluginAsync {
  const { searchService } = deps;

  return async (app) => {
    // Authenticated, permission-aware global search
    app.get<{
      Querystring: {
        q: string;
        category?: string;
        courseId?: string;
        limit?: string;
        offset?: string;
        hybrid?: string;
      };
      Reply: ApiResponse<GlobalSearchResponse>;
    }>(
      '/search',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const parsed = globalSearchQuerySchema.parse(req.query);
        const results = await searchService.search(
          String(req.user!._id),
          req.user!.role,
          {
            query: parsed.q,
            category: parsed.category as any,
            courseId: parsed.courseId,
            limit: parsed.limit,
            offset: parsed.offset,
            hybrid: parsed.hybrid,
          }
        );

        return reply.send({
          success: true,
          data: results,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );
  };
}
