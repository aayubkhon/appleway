import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { accountExportSchema, authSessionSchema, type AuthSession } from '@appleway/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Hoisted because ConfigModule reads the environment when app.module is imported.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT_PER_MINUTE = '1000';
});

const PASSWORD = 'correct-horse-9';

/** Runs against a real Postgres (docker compose up -d postgres). */
describe('account (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  const signUp = async (): Promise<AuthSession> => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `account-${randomUUID()}@e2e.appleway.test`, password: PASSWORD })
      .expect(201);
    const session = authSessionSchema.parse(response.body);
    createdUserIds.push(session.user.id);
    return session;
  };

  /** One customer with one debt that has one payment. */
  const seedLedger = async (session: AuthSession): Promise<void> => {
    const auth = `Bearer ${session.accessToken}`;
    const customer = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', auth)
      .send({ name: 'Aziz aka', phone: '901234567' })
      .expect(201);
    const debt = await request(app.getHttpServer())
      .post('/debts')
      .set('Authorization', auth)
      .send({
        customerId: (customer.body as { id: string }).id,
        amountMinor: 100_00,
        dueOn: '2099-01-01',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/debts/${(debt.body as { id: string }).id}/payments`)
      .set('Authorization', auth)
      .send({ amountMinor: 10_00 })
      .expect(201);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await app.close();
  });

  describe('GET /auth/me/export', () => {
    it('downloads every row the account owns, and nothing else', async () => {
      const session = await signUp();
      const other = await signUp();
      await seedLedger(session);
      await seedLedger(other);

      const response = await request(app.getHttpServer())
        .get('/auth/me/export')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="?appleway-export-\d{4}-\d{2}-\d{2}\.json"?$/,
      );
      expect(response.headers['cache-control']).toBe('no-store');

      const data = accountExportSchema.parse(response.body);
      expect(data.user.id).toBe(session.user.id);
      expect(data.customers).toHaveLength(1);
      expect(data.debts).toHaveLength(1);
      expect(data.payments).toEqual([
        expect.objectContaining({ kind: 'PAYMENT', amountMinor: 10_00 }),
      ]);
      expect(JSON.stringify(data)).not.toContain('passwordHash');
    });

    it('requires an access token', async () => {
      await request(app.getHttpServer()).get('/auth/me/export').expect(401);
    });
  });

  describe('DELETE /auth/me', () => {
    it('refuses a wrong password and keeps the account', async () => {
      const session = await signUp();

      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ password: 'not-my-password' })
        .expect(401);

      expect(await prisma.user.count({ where: { id: session.user.id } })).toBe(1);
    });

    it('erases the account with all of its ledger data and sessions', async () => {
      const session = await signUp();
      await seedLedger(session);
      const ownerId = session.user.id;

      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ password: PASSWORD })
        .expect(204);

      const remaining = await Promise.all([
        prisma.user.count({ where: { id: ownerId } }),
        prisma.customer.count({ where: { ownerId } }),
        prisma.debt.count({ where: { ownerId } }),
        prisma.payment.count({ where: { ownerId } }),
        prisma.refreshToken.count({ where: { userId: ownerId } }),
      ]);
      expect(remaining).toEqual([0, 0, 0, 0, 0]);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);
    });

    it('leaves other accounts untouched', async () => {
      const doomed = await signUp();
      const survivor = await signUp();
      await seedLedger(survivor);

      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Authorization', `Bearer ${doomed.accessToken}`)
        .send({ password: PASSWORD })
        .expect(204);

      expect(await prisma.debt.count({ where: { ownerId: survivor.user.id } })).toBe(1);
    });
  });
});
