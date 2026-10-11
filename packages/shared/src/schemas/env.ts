import { z } from 'zod';

export const NodeEnvSchema = z.enum(['development', 'test', 'production']);

export const ApiEnvSchema = z.object({
  NODE_ENV: NodeEnvSchema.default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // Session & Security
  SESSION_SECRET: z.string().min(32).default('omnitutor-session-secret-key-32-chars-minimum-required'),
  COOKIE_DOMAIN: z.string().optional(),
  APP_URL: z.string().default('http://localhost:5173'),
  EMAIL_PROVIDER: z.enum(['mock', 'smtp', 'console']).default('mock'),
  // Database configuration
  MONGODB_URI: z.string().url().default('mongodb://localhost:27017/omnitutor'),
  // Vector store configuration
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),
  // AI Provider configuration
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
});

export const WebEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:4000/api/v1'),
  VITE_APP_NAME: z.string().default('OmniTutor AI'),
});
