import type { FastifyError, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../config/logger.js';

const plugin: FastifyPluginAsync = async (fastify) => {
  // Global 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    return sendError(
      reply,
      404,
      'NOT_FOUND',
      `Route '${request.method} ${request.url}' was not found`
    );
  });

  // Global error handler
  fastify.setErrorHandler((error: FastifyError | Error, request, reply) => {
    logger.error(
      {
        err: error,
        requestId: request.headers['x-request-id'] || request.id,
        url: request.url,
        method: request.method,
      },
      error.message
    );

    // 1. Handled AppError instances
    if (error instanceof AppError) {
      return sendError(
        reply,
        error.statusCode,
        error.code,
        error.message,
        error.details
      );
    }

    // 2. Zod validation errors
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Request validation failed',
        details
      );
    }

    // 3. Fastify built-in schema validation errors
    if ('validation' in error && error.validation) {
      const details = (
        error.validation as Array<{
          instancePath?: string;
          message?: string;
          keyword?: string;
        }>
      ).map((v) => ({
        field: v.instancePath || 'request',
        message: v.message || 'Validation failed',
        code: v.keyword,
      }));
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        error.message || 'Request validation failed',
        details
      );
    }

    // 4. Fastify HTTP errors
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return sendError(
        reply,
        error.statusCode,
        error.code || 'HTTP_ERROR',
        error.message || 'An HTTP error occurred'
      );
    }

    // 5. Unhandled internal errors
    return sendError(
      reply,
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred. Please try again later.'
    );
  });
};

export const errorHandlerPlugin = fp(plugin, {
  name: 'errorHandlerPlugin',
  fastify: '5.x',
});
