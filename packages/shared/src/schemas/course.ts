import { z } from 'zod';

export const academicLevelEnum = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'undergraduate',
  'graduate',
]);

export const courseStatusEnum = z.enum(['active', 'archived', 'draft']);

export const sourceTypeEnum = z.enum([
  'pdf',
  'pptx',
  'docx',
  'txt',
  'md',
  'video',
  'audio',
]);

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, 'Course title must be at least 3 characters')
    .max(120, 'Course title cannot exceed 120 characters')
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim(),
  subject: z
    .string()
    .min(2, 'Subject must be at least 2 characters')
    .max(50, 'Subject cannot exceed 50 characters')
    .trim(),
  academicLevel: academicLevelEnum.default('intermediate'),
  tags: z
    .array(z.string().min(1).max(30).trim())
    .max(10, 'Maximum 10 tags allowed')
    .default([]),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  status: courseStatusEnum.optional(),
  isArchived: z.boolean().optional(),
});

export const courseFilterSchema = z.object({
  search: z.string().optional(),
  subject: z.string().optional(),
  academicLevel: academicLevelEnum.optional(),
  status: z.enum(['all', 'active', 'archived']).default('active'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uploadLimits = {
  pdf: { maxSizeBytes: 25 * 1024 * 1024, extensions: ['.pdf'] },
  pptx: { maxSizeBytes: 30 * 1024 * 1024, extensions: ['.pptx'] },
  docx: { maxSizeBytes: 20 * 1024 * 1024, extensions: ['.docx'] },
  txt: { maxSizeBytes: 5 * 1024 * 1024, extensions: ['.txt'] },
  md: { maxSizeBytes: 5 * 1024 * 1024, extensions: ['.md', '.markdown'] },
  audio: { maxSizeBytes: 50 * 1024 * 1024, extensions: ['.mp3', '.wav'] },
  video: { maxSizeBytes: 100 * 1024 * 1024, extensions: ['.mp4'] },
  maxTotalPerCourseBytes: 250 * 1024 * 1024, // 250 MB max per course library
  maxMaterialsPerCourse: 50,
};

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CourseFilterQuery = z.infer<typeof courseFilterSchema>;

export const createLearningObjectiveSchema = z.object({
  code: z.string().min(2).max(20).trim(),
  title: z.string().min(3).max(150).trim(),
  description: z.string().min(5).max(1000).trim(),
  topic: z.string().min(2).max(100).trim(),
  materialIds: z.array(z.string()).optional().default([]),
});

export type CreateLearningObjectiveInput = z.infer<typeof createLearningObjectiveSchema>;

