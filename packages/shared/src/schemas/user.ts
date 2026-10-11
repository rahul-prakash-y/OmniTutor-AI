import { z } from 'zod';

export const UserRoleSchema = z.enum(['student', 'admin']);

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('dark'),
  preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  socraticPacing: z.enum(['gentle', 'balanced', 'rigorous']).default('balanced'),
  enableSoundEffects: z.boolean().default(true),
  voiceSpeed: z.number().min(0.5).max(2.0).default(1.0),
});

export const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').trim(),
  preferences: UserPreferencesSchema.partial().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  preferences: UserPreferencesSchema.partial().optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(128, 'New password must not exceed 128 characters'),
});

export const CreateUserSchema = RegisterSchema;
export const UpdateUserSchema = UpdateProfileSchema;

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

