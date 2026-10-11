import { z } from 'zod';

export const TutoringModeSchema = z.enum(['socratic', 'direct', 'quiz', 'code_review']);

export const CreateSessionSchema = z.object({
  title: z.string().min(1).max(120),
  subject: z.string().min(1).max(80),
  mode: TutoringModeSchema.default('socratic'),
  initialPrompt: z.string().min(1).max(2000).optional(),
});

export const SendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  mode: TutoringModeSchema.optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const CreateConceptNoteSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1).max(30)).default([]),
});
