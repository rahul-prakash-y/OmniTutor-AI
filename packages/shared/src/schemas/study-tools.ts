import { z } from 'zod';

export const createStudyNoteSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  category: z.enum(['explanation', 'revision', 'summary', 'flashcard']).default('revision'),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(30000),
  tags: z.array(z.string().max(50)).default([]),
  citations: z.array(z.any()).optional(),
  flashcardData: z
    .object({
      front: z.string().min(1).max(1000),
      back: z.string().min(1).max(2000),
    })
    .optional(),
});

export const updateStudyNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(30000).optional(),
  tags: z.array(z.string().max(50)).optional(),
  category: z.enum(['explanation', 'revision', 'summary', 'flashcard']).optional(),
});

export const groundedSummarySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  materialId: z.string().optional(),
  topic: z.string().max(120).optional(),
  style: z.enum(['concise', 'detailed', 'bullet_points']).default('concise'),
});

export const groundedFlashcardsSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  topic: z.string().max(120).optional(),
  count: z.number().int().min(2).max(15).default(5),
});
