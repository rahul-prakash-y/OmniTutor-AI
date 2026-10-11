import { z } from 'zod';

export const recordLearningEventSchema = z.object({
  eventType: z.enum([
    'assessment_submission',
    'tutor_interaction',
    'material_view',
    'concept_reviewed',
    'active_study_session',
  ]),
  courseId: z.string().optional(),
  materialId: z.string().optional(),
  topic: z.string().max(120).optional(),
  durationSeconds: z.number().int().min(1).max(7200).default(60), // capped to 2 hours max per active event
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().max(100).optional(),
});

export const setStudyGoalSchema = z.object({
  weeklyHoursTarget: z.number().min(0.5).max(80).default(5),
  dailyMinutesTarget: z.number().int().min(5).max(720).default(45),
  targetAssessmentsPerWeek: z.number().int().min(1).max(50).default(3),
  timezone: z.string().max(60).default('UTC'),
  targetCompletionDate: z.string().datetime().optional(),
});

export const generateStudyPlanSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  weeklyAvailableHours: z.number().min(1).max(50).default(6),
  targetWeeks: z.number().int().min(1).max(24).default(4),
  scheduleType: z.enum(['weekly', 'custom', 'exam_prep']).default('weekly'),
});

export const updateStudyPlanMilestoneSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  estimatedHours: z.number().min(0.25).max(40).optional(),
});

export const activityHistoryQuerySchema = z.object({
  courseId: z.string().optional(),
  eventType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
