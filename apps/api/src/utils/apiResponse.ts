import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ApiResponse, ApiErrorDetail } from '@omnitutor/shared';

export function createApiMeta(request: FastifyRequest): ApiResponse['meta'] {
  const startTime = request.startTime ?? Date.now();
  const durationMs = Math.max(0, Date.now() - startTime);

  return {
    requestId: (request.headers['x-request-id'] as string) || request.id || 'unknown-request-id',
    timestamp: new Date().toISOString(),
    durationMs,
  };
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
): FastifyReply {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: createApiMeta(reply.request),
  };

  return reply.status(statusCode).send(response);
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: ApiErrorDetail[]
): FastifyReply {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      statusCode,
      details,
    },
    meta: createApiMeta(reply.request),
  };

  return reply.status(statusCode).send(response);
}
