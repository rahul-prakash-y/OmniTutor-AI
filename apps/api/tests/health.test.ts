import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.js';
import { MockAIProvider } from '../src/services/ai/mock.provider.js';
import { MockVectorService } from '../src/services/vector/mock.vector.service.js';
import type { ApiResponse, HealthCheckData, ReadinessCheckData } from '@omnitutor/shared';

describe('Health and Readiness Endpoints', () => {
  let app: FastifyInstance;
  let mockAI: MockAIProvider;
  let mockVector: MockVectorService;

  beforeAll(async () => {
    mockAI = new MockAIProvider();
    mockVector = new MockVectorService();
    app = createApp({
      aiProvider: mockAI,
      vectorService: mockVector,
      disableRequestLogging: true,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns standard ApiResponse envelope with healthy services', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const body: ApiResponse<HealthCheckData> = JSON.parse(response.body);

    expect(body.success).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.requestId).toBeDefined();
    expect(body.meta.timestamp).toBeDefined();
    expect(body.data).toBeDefined();
    expect(body.data?.version).toBe('0.1.0');
    expect(body.data?.services.vectorStore.status).toBe('healthy');
    expect(body.data?.services.aiProvider.status).toBe('healthy');
  });

  it('GET /api/v1/ready returns readiness check response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ready',
    });

    // In unit test without live MongoDB, readiness returns 503 with ready: false or 200 if connected
    expect([200, 503]).toContain(response.statusCode);
    const body: ApiResponse<ReadinessCheckData> = JSON.parse(response.body);

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(typeof body.data?.ready).toBe('boolean');
    expect(body.data?.services.vectorStore).toBe(true);
  });

  it('Propagates incoming x-request-id header', async () => {
    const customId = 'test-request-id-12345';
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: {
        'x-request-id': customId,
      },
    });

    expect(response.headers['x-request-id']).toBe(customId);
    const body: ApiResponse = JSON.parse(response.body);
    expect(body.meta.requestId).toBe(customId);
  });
});
