import { z } from 'zod';

/**
 * Every environment difference the app has lives here. EXPO_PUBLIC_* values are
 * compiled into the bundle and readable by anyone, so only non-secret config
 * belongs in this file.
 */
const envSchema = z.object({
  apiUrl: z.url({
    error: 'EXPO_PUBLIC_API_URL must be a full URL, e.g. http://192.168.1.10:3000',
  }),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse({ apiUrl: source.EXPO_PUBLIC_API_URL });

  if (!result.success) {
    const problems = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(
      `Invalid app configuration: ${problems}. Copy .env.example to .env and set the values.`,
    );
  }

  return result.data;
}

export const env: Env = parseEnv(process.env);
