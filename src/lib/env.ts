import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  XAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(), // Optional - falls back to in-memory storage
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:9002'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      XAI_API_KEY: process.env.XAI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

export const env = validateEnv();
