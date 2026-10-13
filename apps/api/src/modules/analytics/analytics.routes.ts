import type { FastifyPluginAsync } from 'fastify';
import {
  recordLearningEventSchema,
  setStudyGoalSchema,
  generateStudyPlanSchema,
  updateStudyPlanMilestoneSchema,
  activityHistoryQuerySchema,
  type ApiResponse,
  type StudentAnalyticsSummary,
  type TopicMasteryAnalytics,
  type AssessmentTrendPoint,
  type StudyRecommendation,
  type StudyGoal,
  type StudyPlan,
  type LearningEvent,
  type KnowledgeGap,
  type RevisionScheduleItem,
} from '@omnitutor/shared';
import type { AnalyticsService } from './analytics.service.js';

export function createAnalyticsRoutes(deps: {
  analyticsService: AnalyticsService;
}): FastifyPluginAsync {
  const { analyticsService } = deps;

  return async (app) => {
    // 1. Get high-level student analytics summary
    app.get<{
      Querystring: { timezone?: string };
      Reply: ApiResponse<StudentAnalyticsSummary>;
    }>(
      '/analytics/summary',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const timezone = req.query.timezone || 'UTC';
        const summary = await analyticsService.getStudentSummary(
          String(req.user!._id),
          timezone
        );

        return reply.send({
          success: true,
          data: summary,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 2. Get estimated topic mastery list
    app.get<{
      Querystring: { courseId?: string };
      Reply: ApiResponse<TopicMasteryAnalytics[]>;
    }>(
      '/analytics/topics',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const topics = await analyticsService.getTopicMasteryList(
          String(req.user!._id),
          req.query.courseId
        );

        return reply.send({
          success: true,
          data: topics,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 3. Record an active learning event (idempotent)
    app.post<{
      Body: unknown;
      Reply: ApiResponse<LearningEvent>;
    }>(
      '/analytics/events',
      {
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const parsed = recordLearningEventSchema.parse(req.body);
        const event = await analyticsService.recordLearningEvent(
          String(req.user!._id),
          parsed as any
        );

        return reply.status(201).send({
          success: true,
          data: event,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 4. Paginated activity history
    app.get<{
      Querystring: {
        courseId?: string;
        eventType?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };
      Reply: ApiResponse<{
        items: LearningEvent[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>;
    }>(
      '/analytics/activity',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const parsed = activityHistoryQuerySchema.parse(req.query);
        const result = await analyticsService.getActivityHistory(
          String(req.user!._id),
          parsed
        );

        return reply.send({
          success: true,
          data: result,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 5. Assessment score trends
    app.get<{
      Querystring: { courseId?: string };
      Reply: ApiResponse<AssessmentTrendPoint[]>;
    }>(
      '/analytics/assessment-trends',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const trends = await analyticsService.getAssessmentTrends(
          String(req.user!._id),
          req.query.courseId
        );

        return reply.send({
          success: true,
          data: trends,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 6. Actionable personalized recommendations
    app.get<{
      Reply: ApiResponse<StudyRecommendation[]>;
    }>(
      '/analytics/recommendations',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const recommendations = await analyticsService.getPersonalizedRecommendations(
          String(req.user!._id)
        );

        return reply.send({
          success: true,
          data: recommendations,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 7. Get student study goals
    app.get<{
      Reply: ApiResponse<StudyGoal>;
    }>(
      '/analytics/study-goals',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const goal = await analyticsService.getStudyGoal(String(req.user!._id));

        return reply.send({
          success: true,
          data: goal,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 8. Update study goals
    app.post<{
      Body: unknown;
      Reply: ApiResponse<StudyGoal>;
    }>(
      '/analytics/study-goals',
      {
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const parsed = setStudyGoalSchema.parse(req.body);
        const goal = await analyticsService.setStudyGoal(
          String(req.user!._id),
          parsed
        );

        return reply.send({
          success: true,
          data: goal,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 9. Get active study plan
    app.get<{
      Querystring: { courseId?: string };
      Reply: ApiResponse<StudyPlan | null>;
    }>(
      '/analytics/study-plan',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const plan = await analyticsService.getStudyPlan(
          String(req.user!._id),
          req.query.courseId
        );

        return reply.send({
          success: true,
          data: plan,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 10. Generate personalized study plan
    app.post<{
      Body: unknown;
      Reply: ApiResponse<StudyPlan>;
    }>(
      '/analytics/study-plan/generate',
      {
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const parsed = generateStudyPlanSchema.parse(req.body);
        const plan = await analyticsService.generateStudyPlan(
          String(req.user!._id),
          parsed.courseId,
          {
            weeklyAvailableHours: parsed.weeklyAvailableHours,
            targetWeeks: parsed.targetWeeks,
            scheduleType: parsed.scheduleType,
          }
        );

        return reply.status(201).send({
          success: true,
          data: plan,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 11. Update study plan milestone
    app.patch<{
      Params: { id: string; milestoneId: string };
      Body: unknown;
      Reply: ApiResponse<StudyPlan>;
    }>(
      '/analytics/study-plan/:id/milestones/:milestoneId',
      {
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const parsed = updateStudyPlanMilestoneSchema.parse(req.body);
        const updatedPlan = await analyticsService.updateMilestone(
          String(req.user!._id),
          req.params.id,
          req.params.milestoneId,
          parsed
        );

        return reply.send({
          success: true,
          data: updatedPlan,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 12. Knowledge gap detection
    app.get<{
      Querystring: { courseId?: string };
      Reply: ApiResponse<KnowledgeGap[]>;
    }>(
      '/analytics/knowledge-gaps',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const gaps = await analyticsService.detectKnowledgeGaps(
          String(req.user!._id),
          req.query.courseId
        );

        return reply.send({
          success: true,
          data: gaps,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 13. Spaced-repetition revision schedule
    app.get<{
      Querystring: { courseId?: string };
      Reply: ApiResponse<RevisionScheduleItem[]>;
    }>(
      '/analytics/revision-schedule',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const schedule = await analyticsService.getRevisionSchedule(
          String(req.user!._id),
          req.query.courseId
        );

        return reply.send({
          success: true,
          data: schedule,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 14. Mark revision schedule item completed
    app.post<{
      Params: { scheduleId: string };
      Reply: ApiResponse<RevisionScheduleItem>;
    }>(
      '/analytics/revision-schedule/:scheduleId/complete',
      {
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const item = await analyticsService.completeRevisionScheduleItem(
          String(req.user!._id),
          req.params.scheduleId
        );

        return reply.send({
          success: true,
          data: item,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );
  };
}
