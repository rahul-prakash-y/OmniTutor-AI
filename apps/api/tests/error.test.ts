import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { AppError, ValidationError } from '../src/utils/errors.js';
import type { ApiResponse } from '@omnitutor/shared';

describe('Global Error Handling and Routing', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = createApp({ disableRequestLogging: true });

    // Test routes throwing errors
    app.get('/test-error', async () => {
      throw new AppError('Custom business failure', 422, 'CUSTOM_ERROR');
    });

    app.get('/test-validation-error', async () => {
      throw new ValidationError('Validation failed', [{ field: 'email', message: 'Invalid format' }]);
    });

    app.get('/test-unhandled-error', async () => {
      throw new Error('Database disk crashed');
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Returns 404 with structured error envelope for non-existent routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route-404',
    });

    expect(response.statusCode).toBe(404);
    const body: ApiResponse = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('NOT_FOUND');
    expect(body.error?.statusCode).toBe(404);
    expect(body.meta.requestId).toBeDefined();
  });

  it('Formats AppError with specific status code and code', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });

    expect(response.statusCode).toBe(422);
    const body: ApiResponse = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('CUSTOM_ERROR');
    expect(body.error?.message).toBe('Custom business failure');
  });

  it('Formats ValidationError with details array', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test-validation-error',
    });

    expect(response.statusCode).toBe(400);
    const body: ApiResponse = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
    expect(body.error?.details).toHaveLength(1);
    expect(body.error?.details?.[0]?.field).toBe('email');
  });

  it('Transforms unhandled generic errors into safe 500 response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test-unhandled-error',
    });

    expect(response.statusCode).toBe(500);
    const body: ApiResponse = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error?.message).toContain('unexpected error');
  });
});
