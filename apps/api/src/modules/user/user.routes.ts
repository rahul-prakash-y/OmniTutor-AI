import type { FastifyPluginAsync } from 'fastify';
import {
  UpdateProfileSchema,
  type ApiResponse,
  type UserProfile,
} from '@omnitutor/shared';
import { UserService } from './user.service.js';
import { ValidationError } from '../../utils/errors.js';

export interface UserRouteOptions {
  userService: UserService;
}

export function createUserRoutes(options: UserRouteOptions): FastifyPluginAsync {
  const { userService } = options;

  return async (fastify) => {
    /**
     * GET /users/me - Current user profile
     */
    fastify.get(
      '/users/me',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const profile = await userService.getProfile(String(request.user!._id));

        const response: ApiResponse<UserProfile> = {
          success: true,
          data: profile,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * PATCH /users/me - Update profile & preferences
     */
    fastify.patch(
      '/users/me',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        const parsed = UpdateProfileSchema.safeParse(request.body);
        if (!parsed.success) {
          throw new ValidationError('Profile update validation failed', parsed.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })));
        }

        const profile = await userService.updateProfile(
          String(request.user!._id),
          parsed.data
        );

        const response: ApiResponse<UserProfile> = {
          success: true,
          data: profile,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * DELETE /users/me - Delete account and revoke sessions
     */
    fastify.delete(
      '/users/me',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        await userService.deleteAccount(String(request.user!._id));
        reply.clearCookie('session_token', { path: '/' });

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: 'Your account has been deleted successfully.' },
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * GET /admin/users - List users (Admin role required)
     */
    fastify.get(
      '/admin/users',
      { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
      async (request, reply) => {
        const users = await userService.listUsers();

        const response: ApiResponse<UserProfile[]> = {
          success: true,
          data: users,
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
