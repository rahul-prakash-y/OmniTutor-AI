import { z } from 'zod';

export const ApiMetaSchema = z.object({
  requestId: z.string().min(1),
  timestamp: z.string().datetime(),
  durationMs: z.number().nonnegative().optional(),
});

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const ApiErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  statusCode: z.number().int(),
  details: z.array(ApiErrorDetailSchema).optional(),
});

export const ServiceHealthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  latencyMs: z.number().nonnegative().optional(),
  message: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export const HealthCheckDataSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  uptimeSeconds: z.number().nonnegative(),
  environment: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
  services: z.object({
    database: ServiceHealthStatusSchema,
    vectorStore: ServiceHealthStatusSchema,
    aiProvider: ServiceHealthStatusSchema,
  }),
});

export const ReadinessCheckDataSchema = z.object({
  ready: z.boolean(),
  services: z.object({
    database: z.boolean(),
    vectorStore: z.boolean(),
  }),
  timestamp: z.string().datetime(),
});

export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorPayloadSchema.optional(),
    meta: ApiMetaSchema,
  });
