import type { FastifyPluginAsync } from 'fastify';
import {
  createCourseSchema,
  updateCourseSchema,
  courseFilterSchema,
  createLearningObjectiveSchema,
  type ApiResponse,
  type Course,
  type LearningObjective,
  type LearningObjectiveCoverage,
  type InstructorCourseAnalytics,
} from '@omnitutor/shared';
import { CourseService } from './course.service.js';
import { ValidationError } from '../../utils/errors.js';

export interface CourseRouteOptions {
  courseService: CourseService;
}

export function createCourseRoutes(options: CourseRouteOptions): FastifyPluginAsync {
  const { courseService } = options;

  return async (fastify) => {
    /**
     * POST /courses - Create a new course
     */
    fastify.post(
      '/courses',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        const parsed = createCourseSchema.safeParse(request.body);
        if (!parsed.success) {
          throw new ValidationError(
            'Course creation validation failed',
            parsed.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            }))
          );
        }

        const course = await courseService.createCourse(
          String(request.user!._id),
          parsed.data
        );

        const response: ApiResponse<Course> = {
          success: true,
          data: course,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.status(201).send(response);
      }
    );

    /**
     * GET /courses - List user courses with filter & pagination
     */
    fastify.get(
      '/courses',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const queryParsed = courseFilterSchema.safeParse(request.query);
        const filter = queryParsed.success
          ? queryParsed.data
          : { status: 'active' as const, page: 1, limit: 20 };

        const result = await courseService.getCourses(
          String(request.user!._id),
          filter
        );

        const response: ApiResponse<{
          courses: Course[];
          total: number;
          page: number;
          limit: number;
        }> = {
          success: true,
          data: result,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * GET /courses/:courseId - Get course details
     */
    fastify.get<{ Params: { courseId: string } }>(
      '/courses/:courseId',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const course = await courseService.getCourseById(
          request.params.courseId,
          String(request.user!._id)
        );

        const response: ApiResponse<Course> = {
          success: true,
          data: course,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * PATCH /courses/:courseId - Update course metadata
     */
    fastify.patch<{ Params: { courseId: string } }>(
      '/courses/:courseId',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        const parsed = updateCourseSchema.safeParse(request.body);
        if (!parsed.success) {
          throw new ValidationError(
            'Course update validation failed',
            parsed.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            }))
          );
        }

        const course = await courseService.updateCourse(
          request.params.courseId,
          String(request.user!._id),
          parsed.data
        );

        const response: ApiResponse<Course> = {
          success: true,
          data: course,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * POST /courses/:courseId/archive - Archive or unarchive course
     */
    fastify.post<{ Params: { courseId: string }; Body: { isArchived?: boolean } }>(
      '/courses/:courseId/archive',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        const isArchived = request.body?.isArchived !== false; // default true
        const course = await courseService.archiveCourse(
          request.params.courseId,
          String(request.user!._id),
          isArchived
        );

        const response: ApiResponse<Course> = {
          success: true,
          data: course,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * DELETE /courses/:courseId - Delete course and cascade its materials
     */
    fastify.delete<{ Params: { courseId: string } }>(
      '/courses/:courseId',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        await courseService.deleteCourse(
          request.params.courseId,
          String(request.user!._id)
        );

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: 'Course and all associated materials deleted successfully.' },
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * POST /courses/:courseId/objectives - Create a learning objective for course
     */
    fastify.post<{ Params: { courseId: string }; Body: unknown }>(
      '/courses/:courseId/objectives',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        const parsed = createLearningObjectiveSchema.safeParse(request.body);
        if (!parsed.success) {
          throw new ValidationError(
            'Learning objective validation failed',
            parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
          );
        }

        const objective = await courseService.createLearningObjective(
          request.params.courseId,
          String(request.user!._id),
          request.user!.role,
          parsed.data
        );

        const response: ApiResponse<LearningObjective> = {
          success: true,
          data: objective,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.status(201).send(response);
      }
    );

    /**
     * GET /courses/:courseId/objectives - List learning objectives for course
     */
    fastify.get<{ Params: { courseId: string } }>(
      '/courses/:courseId/objectives',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const objectives = await courseService.getLearningObjectives(
          request.params.courseId,
          String(request.user!._id),
          request.user!.role
        );

        const response: ApiResponse<LearningObjective[]> = {
          success: true,
          data: objectives,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * GET /courses/:courseId/objectives/coverage - Objective mapping & syllabus coverage
     */
    fastify.get<{ Params: { courseId: string } }>(
      '/courses/:courseId/objectives/coverage',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const coverage = await courseService.getLearningObjectivesCoverage(
          request.params.courseId,
          String(request.user!._id),
          request.user!.role
        );

        const response: ApiResponse<LearningObjectiveCoverage[]> = {
          success: true,
          data: coverage,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * GET /courses/:courseId/instructor-analytics - Cohort report for instructors
     */
    fastify.get<{ Params: { courseId: string } }>(
      '/courses/:courseId/instructor-analytics',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const analytics = await courseService.getInstructorCourseAnalytics(
          request.params.courseId,
          String(request.user!._id),
          request.user!.role
        );

        const response: ApiResponse<InstructorCourseAnalytics> = {
          success: true,
          data: analytics,
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
