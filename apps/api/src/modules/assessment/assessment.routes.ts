import type { FastifyPluginAsync } from 'fastify';
import {
  generateAssessmentSchema,
  submitAssessmentAttemptSchema,
  type ApiResponse,
  type Assessment,
  type AssessmentAttempt,
  type TopicMastery,
  type QuestionSubmission,
} from '@omnitutor/shared';
import type { AssessmentService } from './assessment.service.js';

export function createAssessmentRoutes(deps: {
  assessmentService: AssessmentService;
}): FastifyPluginAsync {
  const { assessmentService } = deps;

  return async (app) => {
    // 1. Generate adaptive assessment from indexed curriculum
    app.post<{
      Params: { courseId: string };
      Body: unknown;
      Reply: ApiResponse<Assessment>;
    }>(
      '/courses/:courseId/assessments/generate',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const parsed = generateAssessmentSchema.parse(req.body);

        const assessment = await assessmentService.generateAssessment(
          courseId,
          String(req.user!._id),
          req.user!.role,
          {
            ...parsed,
            courseId,
          }
        );

        return reply.status(201).send({
          success: true,
          data: assessment,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 2. List assessments in course
    app.get<{
      Params: { courseId: string };
      Querystring: { limit?: string; offset?: string };
      Reply: ApiResponse<{ items: Assessment[]; total: number }>;
    }>(
      '/courses/:courseId/assessments',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

        const result = await assessmentService.listAssessments(
          courseId,
          String(req.user!._id),
          req.user!.role,
          limit,
          offset
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

    // 3. Get single assessment (client safe view)
    app.get<{
      Params: { assessmentId: string };
      Reply: ApiResponse<Assessment>;
    }>(
      '/assessments/:assessmentId',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { assessmentId } = req.params;
        const assessment = await assessmentService.getAssessment(
          assessmentId,
          String(req.user!._id),
          req.user!.role
        );

        return reply.status(200).send({
          success: true,
          data: assessment,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 4. Submit assessment attempt for deterministic and rubric grading
    app.post<{
      Params: { assessmentId: string };
      Body: unknown;
      Reply: ApiResponse<AssessmentAttempt>;
    }>(
      '/assessments/:assessmentId/submit',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { assessmentId } = req.params;
        const parsed = submitAssessmentAttemptSchema.parse(req.body);

        const attempt = await assessmentService.submitAttempt(
          assessmentId,
          String(req.user!._id),
          req.user!.role,
          parsed.responses as unknown as QuestionSubmission[]
        );

        return reply.status(200).send({
          success: true,
          data: attempt,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 5. Get course topic masteries for user
    app.get<{
      Params: { courseId: string };
      Reply: ApiResponse<TopicMastery[]>;
    }>(
      '/courses/:courseId/assessments/mastery',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const masteries = await assessmentService.getTopicMasteries(
          courseId,
          String(req.user!._id),
          req.user!.role
        );

        return reply.status(200).send({
          success: true,
          data: masteries,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 6. Get assessment attempt history
    app.get<{
      Params: { courseId: string };
      Reply: ApiResponse<AssessmentAttempt[]>;
    }>(
      '/courses/:courseId/assessments/attempts',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const attempts = await assessmentService.getAttempts(
          courseId,
          String(req.user!._id),
          req.user!.role
        );

        return reply.status(200).send({
          success: true,
          data: attempts,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );
  };
}
