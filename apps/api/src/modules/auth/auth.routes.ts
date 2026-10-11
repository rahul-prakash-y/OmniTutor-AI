import type { FastifyPluginAsync } from 'fastify';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  type ApiResponse,
  type AuthResponse,
  type UserProfile,
} from '@omnitutor/shared';
import { AuthService } from './auth.service.js';
import { generateCsrfToken } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import { ValidationError } from '../../utils/errors.js';
import type { MockEmailService } from '../../services/email/mock.email.service.js';

export interface AuthRouteOptions {
  authService: AuthService;
  emailService?: MockEmailService;
}

export function createAuthRoutes(options: AuthRouteOptions): FastifyPluginAsync {
  const { authService, emailService } = options;

  return async (fastify) => {
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      domain: env.COOKIE_DOMAIN || undefined,
    };

    /**
     * POST /auth/register
     */
    fastify.post('/auth/register', async (request, reply) => {
      const parsed = RegisterSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Registration validation failed', parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })));
      }

      const ip = request.ip;
      const userAgent = request.headers['user-agent'];
      const result = await authService.register(parsed.data, { ip, userAgent });

      reply.setCookie('session_token', result.sessionToken, cookieOptions);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          user: result.user,
          csrfToken: result.csrfToken,
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      };

      return reply.status(201).send(response);
    });

    /**
     * POST /auth/login
     */
    fastify.post('/auth/login', async (request, reply) => {
      const parsed = LoginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Login validation failed', parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })));
      }

      const ip = request.ip;
      const userAgent = request.headers['user-agent'];
      const result = await authService.login(parsed.data, { ip, userAgent });

      reply.setCookie('session_token', result.sessionToken, cookieOptions);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          user: result.user,
          csrfToken: result.csrfToken,
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      };

      return reply.send(response);
    });

    /**
     * POST /auth/logout
     */
    fastify.post(
      '/auth/logout',
      { preHandler: [fastify.authenticate, fastify.validateCsrf] },
      async (request, reply) => {
        if (request.sessionToken) {
          const query = request.query as { all?: string };
          const revokeAll = query?.all === 'true';
          await authService.logout(request.sessionToken, revokeAll);
        }

        reply.clearCookie('session_token', { path: '/' });

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: 'Logged out successfully' },
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * GET /auth/me - Current user & session restoration
     */
    fastify.get(
      '/auth/me',
      { preHandler: [fastify.authenticate] },
      async (request, reply) => {
        const user = request.user!.toProfile();
        const csrfToken = generateCsrfToken(request.sessionToken!, env.SESSION_SECRET);

        const response: ApiResponse<AuthResponse> = {
          success: true,
          data: {
            user,
            csrfToken,
            session: {
              id: String(request.session!._id),
              userAgent: request.session!.userAgent || undefined,
              ipAddress: request.session!.ipAddress || undefined,
              createdAt: request.session!.createdAt.toISOString(),
              expiresAt: request.session!.expiresAt.toISOString(),
              isCurrent: true,
            },
          },
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        };

        return reply.send(response);
      }
    );

    /**
     * POST /auth/forgot-password
     */
    fastify.post('/auth/forgot-password', async (request, reply) => {
      const parsed = ForgotPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })));
      }

      await authService.forgotPassword(parsed.data.email);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message:
            'If an account exists with that email address, a password reset link has been dispatched.',
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      };

      return reply.send(response);
    });

    /**
     * POST /auth/reset-password
     */
    fastify.post('/auth/reset-password', async (request, reply) => {
      const parsed = ResetPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })));
      }

      await authService.resetPassword(parsed.data.token, parsed.data.newPassword);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Password reset successful. Please log in with your new credentials.',
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      };

      return reply.send(response);
    });

    /**
     * POST /auth/verify-email
     */
    fastify.post('/auth/verify-email', async (request, reply) => {
      const parsed = VerifyEmailSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })));
      }

      const user = await authService.verifyEmail(parsed.data.token);

      const response: ApiResponse<{ user: UserProfile; verified: boolean }> = {
        success: true,
        data: {
          user,
          verified: true,
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      };

      return reply.send(response);
    });

    /**
     * Development / Test only: GET /auth/dev-tokens
     * Safely returns recent verification & reset tokens for automated testing without exposing in production.
     */
    if (env.NODE_ENV !== 'production' && emailService) {
      fastify.get('/auth/dev-tokens', async (_request, reply) => {
        const emails = emailService.getSentEmails();
        return reply.send({
          success: true,
          data: emails.map((e) => ({
            to: e.to,
            type: e.type,
            token: e.token,
            url: e.url,
            sentAt: e.sentAt,
          })),
        });
      });
    }
  };
}
