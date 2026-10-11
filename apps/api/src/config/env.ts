import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiEnvSchema } from '@omnitutor/shared';
import type { z } from 'zod';

// Load .env from current directory or monorepo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const parsed = ApiEnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid API environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  throw new Error('Invalid environment variables for @omnitutor/api');
}

export type ApiEnv = z.infer<typeof ApiEnvSchema>;
export const env: ApiEnv = parsed.data;
