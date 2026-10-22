import { z } from 'zod';

/**
 * Every environment difference the api has lives here. Deploy targets change
 * these values, never the code.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  /** Comma separated list of allowed origins, or '*' while developing. */
  CORS_ORIGINS: z.string().default('*'),
  /** IANA timezone used when the api has to decide what "today" means. */
  DEFAULT_TIMEZONE: z.string().default('Asia/Tashkent'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates process environment at boot. Throws with a readable list of
 * problems so a misconfigured deploy fails immediately instead of at first use.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return result.data;
}
