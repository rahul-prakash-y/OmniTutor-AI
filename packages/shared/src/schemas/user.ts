import { z } from 'zod';

export const UserRoleSchema = z.enum(['student', 'tutor', 'admin']);

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('dark'),
  preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  socraticPacing: z.enum(['gentle', 'balanced', 'rigorous']).default('balanced'),
  enableSoundEffects: z.boolean().default(true),
  voiceSpeed: z.number().min(0.5).max(2.0).default(1.0),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(100),
  role: UserRoleSchema.default('student'),
  preferences: UserPreferencesSchema.partial().optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial();
