import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';

// Hoisted because ConfigModule reads the environment when app.module is imported.
const LIMIT = vi.hoisted(() => {
  const limit = 3;
  process.env.AUTH_RATE_LIMIT_PER_MINUTE = String(limit);
  return limit;
});

describe('auth rate limit (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 once a client exceeds the per-minute login limit', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'nobody@e2e.appleway.test', password: 'guess-guess' });

    for (let i = 0; i < LIMIT; i += 1) {
      await attempt().expect(401);
    }

    await attempt().expect(429);
  });

  it('does not throttle routes outside auth', async () => {
    for (let i = 0; i < LIMIT + 2; i += 1) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
