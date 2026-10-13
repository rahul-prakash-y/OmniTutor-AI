import type { FastifyPluginAsync } from 'fastify';
import type { ApiResponse, AIEvalMetricSummary } from '@omnitutor/shared';
import type { AIEvalService } from './ai-eval.service.js';

export function createAIEvalRoutes(deps: { aiEvalService: AIEvalService }): FastifyPluginAsync {
  const { aiEvalService } = deps;

  return async (app) => {
    /**
     * GET /ai-eval/metrics - Get latest AI evaluation benchmark metrics
     */
    const handleGetMetrics = async (
      req: any,
      reply: { send: (payload: ApiResponse<AIEvalMetricSummary>) => void }
    ) => {
      const metrics = await aiEvalService.getLatestMetrics();

      return reply.send({
        success: true,
        data: metrics,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    };

    app.get('/ai-eval/metrics', { preHandler: [app.authenticate] }, handleGetMetrics);
    app.get('/admin/ai-eval/metrics', { preHandler: [app.authenticate] }, handleGetMetrics);

    /**
     * POST /ai-eval/benchmark - Trigger new evaluation benchmark suite
     */
    const handleRunBenchmark = async (
      req: any,
      reply: { send: (payload: ApiResponse<AIEvalMetricSummary>) => void }
    ) => {
      const body = (req.body || {}) as { courseId?: string };
      const results = await aiEvalService.runBenchmark(body.courseId);

      return reply.send({
        success: true,
        data: results,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    };

    app.post('/ai-eval/benchmark', { preHandler: [app.authenticate, app.validateCsrf] }, handleRunBenchmark);
    app.post('/admin/ai-eval/benchmark', { preHandler: [app.authenticate, app.validateCsrf] }, handleRunBenchmark);
  };
}
