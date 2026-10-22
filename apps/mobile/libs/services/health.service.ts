import { z } from 'zod';

import { apiRequest } from './api-client';

const healthReportSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
  uptimeSeconds: z.number(),
});

export type HealthReport = z.infer<typeof healthReportSchema>;

/** Confirms the phone can reach the api and that the api can reach Postgres. */
export async function fetchHealth(): Promise<HealthReport> {
  return healthReportSchema.parse(await apiRequest('/health'));
}
