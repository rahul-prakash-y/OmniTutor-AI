import { z } from 'zod';

export const ragQuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(2000, 'Query exceeds maximum 2000 characters'),
  materialId: z.string().optional(),
  topK: z.number().int().min(1).max(20).optional().default(5),
  minScore: z.number().min(0).max(1).optional().default(0.35),
  rerankEnabled: z.boolean().optional().default(true),
  academicLevel: z.enum(['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate']).optional().default('intermediate'),
});

export const ragDiagnosticsSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(2000),
  materialId: z.string().optional(),
  topK: z.number().int().min(1).max(30).optional().default(10),
  minScore: z.number().min(0).max(1).optional().default(0.1),
});

export const resolveCitationSchema = z.object({
  chunkId: z.string().min(1, 'chunkId is required'),
});

export type RagQueryDto = z.infer<typeof ragQuerySchema>;
export type RagDiagnosticsDto = z.infer<typeof ragDiagnosticsSchema>;
export type ResolveCitationDto = z.infer<typeof resolveCitationSchema>;
