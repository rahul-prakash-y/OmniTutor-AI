import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  materialId: z.string().optional(),
  mode: z.enum(['socratic', 'direct', 'quiz', 'code_review']).optional().default('socratic'),
  academicLevel: z.enum(['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate']).optional().default('intermediate'),
  explanationStyle: z.enum(['step_by_step', 'analogy', 'summary', 'revision_notes']).optional().default('step_by_step'),
  language: z.string().min(2).max(10).optional().default('en'),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  isPinned: z.boolean().optional(),
  mode: z.enum(['socratic', 'direct', 'quiz', 'code_review']).optional(),
  academicLevel: z.enum(['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate']).optional(),
  explanationStyle: z.enum(['step_by_step', 'analogy', 'summary', 'revision_notes']).optional(),
  language: z.string().min(2).max(10).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
  academicLevel: z.enum(['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate']).optional(),
  explanationStyle: z.enum(['step_by_step', 'analogy', 'summary', 'revision_notes']).optional(),
  requestHint: z.boolean().optional().default(false),
  socraticStep: z.enum(['probe', 'hint', 'synthesize', 'explain', 'auto']).optional(),
  language: z.string().min(2).max(10).optional(),
  materialId: z.string().optional(),
});

export const synthesizeSpeechSchema = z.object({
  text: z.string().min(1).max(2000),
  language: z.string().min(2).max(10).optional().default('en'),
  speed: z.number().min(0.5).max(2.0).optional().default(1.0),
});

export const createConceptNoteSchema = z.object({
  title: z.string().min(1).max(150),
  content: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  citations: z.array(z.any()).optional(),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;
export type UpdateConversationDto = z.infer<typeof updateConversationSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type SynthesizeSpeechDto = z.infer<typeof synthesizeSpeechSchema>;
export type CreateConceptNoteDto = z.infer<typeof createConceptNoteSchema>;
