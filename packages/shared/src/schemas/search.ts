import { z } from 'zod';

export const globalSearchQuerySchema = z.object({
  q: z.string().min(1, 'Query must not be empty').max(300),
  category: z
    .enum(['all', 'course', 'material', 'chunk', 'note', 'conversation', 'assessment'])
    .default('all'),
  courseId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  hybrid: z
    .string()
    .transform((val) => val === 'true')
    .or(z.boolean())
    .default(true),
});

export const recordRecentMaterialSchema = z.object({
  lastPosition: z
    .object({
      page: z.number().int().min(1).optional(),
      timestamp: z.number().min(0).optional(),
    })
    .optional(),
});
