import { z } from 'zod';

export const generateAssessmentSchema = z.object({
  mode: z.enum([
    'quiz',
    'topic_practice',
    'chapter_assessment',
    'revision_test',
    'adaptive_session',
    'missed_practice',
  ]).default('quiz'),
  topic: z.string().optional(),
  materialId: z.string().optional(),
  questionCount: z.number().int().min(1).max(25).optional().default(5),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate']).optional().default('intermediate'),
  questionTypes: z
    .array(z.enum(['multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'flashcard']))
    .optional(),
});

export const submitQuestionSchema = z.object({
  questionId: z.string().min(1),
  userAnswer: z.any(),
  hintsUsed: z.number().int().min(0).optional().default(0),
  timeSpentSeconds: z.number().min(0).optional().default(0),
});

export const submitAssessmentAttemptSchema = z.object({
  responses: z.array(submitQuestionSchema),
});

export const evaluateAdaptiveNextQuestionSchema = z.object({
  previousQuestionId: z.string(),
  userAnswer: z.any(),
  hintsUsed: z.number().int().min(0).optional().default(0),
});

export type GenerateAssessmentDto = z.infer<typeof generateAssessmentSchema>;
export type SubmitQuestionDto = z.infer<typeof submitQuestionSchema>;
export type SubmitAssessmentAttemptDto = z.infer<typeof submitAssessmentAttemptSchema>;
export type EvaluateAdaptiveNextQuestionDto = z.infer<typeof evaluateAdaptiveNextQuestionSchema>;
