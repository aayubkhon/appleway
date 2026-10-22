import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { z } from 'zod';

import { AppModule } from '../src/app.module.js';

const healthReportSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
  uptimeSeconds: z.number().int().nonnegative(),
});

/**
 * Runs against a real Postgres (docker compose up -d postgres). It is the
 * proof that the api is wired to the database, not just that it compiles.
 */
describe('health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports the database as up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    const report = healthReportSchema.parse(response.body);

    expect(report.status).toBe('ok');
    expect(report.database).toBe('up');
  });
});
