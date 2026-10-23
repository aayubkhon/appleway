import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { authSessionSchema, userProfileSchema, type AuthSession } from '@appleway/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// The rate limit has its own spec; here it must not get in the way. Hoisted
// because ConfigModule reads the environment when app.module is imported.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT_PER_MINUTE = '1000';
});

const PASSWORD = 'correct-horse-9';

const uniqueEmail = (): string => `seller-${randomUUID()}@e2e.appleway.test`;
const uniquePhone = (): string =>
  `+99890${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`;

/** Runs against a real Postgres (docker compose up -d postgres). */
describe('auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  const register = async (body: object): Promise<AuthSession> => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(body)
      .expect(201);
    const session = authSessionSchema.parse(response.body);
    createdUserIds.push(session.user.id);
    return session;
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

  describe('POST /auth/register', () => {
    it('creates an account with email only and returns a session', async () => {
      const email = uniqueEmail();

      const session = await register({ email: email.toUpperCase(), password: PASSWORD });

      expect(session.user.email).toBe(email);
      expect(session.user.phone).toBeNull();
      expect(session.user.timezone).toBe('Asia/Tashkent');
      expect(session.accessTokenExpiresIn).toBe(900);
    });

    it('creates an account with a local phone number, stored as E.164', async () => {
      const phone = uniquePhone();

      const session = await register({ phone: phone.slice(4), password: PASSWORD });

      expect(session.user.phone).toBe(phone);
    });

    it('stores an argon2 hash, never the password', async () => {
      const session = await register({ email: uniqueEmail(), password: PASSWORD });

      const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.passwordHash).not.toContain(PASSWORD);
    });

    it('rejects a duplicate account with 409', async () => {
      const email = uniqueEmail();
      await register({ email, password: PASSWORD });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: PASSWORD })
        .expect(409);
    });

    it('rejects missing identifier and short password with 400, without echoing input', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'Zq7#x' })
        .expect(400);

      expect(JSON.stringify(response.body)).not.toContain('Zq7#x');
      expect(response.body).toMatchObject({ message: 'validation failed' });
    });
  });

  describe('POST /auth/login', () => {
    it('signs in with email or phone', async () => {
      const email = uniqueEmail();
      const phone = uniquePhone();
      await register({ email, phone, password: PASSWORD });

      for (const identifier of [email, phone]) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ identifier, password: PASSWORD })
          .expect(200);

        expect(authSessionSchema.parse(response.body).user.email).toBe(email);
      }
    });

    it('gives the same 401 for a wrong password and an unknown account', async () => {
      const email = uniqueEmail();
      await register({ email, password: PASSWORD });

      const wrongPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: email, password: 'wrong-password' })
        .expect(401);
      const unknownUser = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: uniqueEmail(), password: PASSWORD })
        .expect(401);

      expect(wrongPassword.body).toEqual(unknownUser.body);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the profile for a valid access token', async () => {
      const session = await register({ email: uniqueEmail(), password: PASSWORD });

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(userProfileSchema.parse(response.body)).toEqual(session.user);
    });

    it('rejects a missing or tampered token with 401', async () => {
      const session = await register({ email: uniqueEmail(), password: PASSWORD });

      await request(app.getHttpServer()).get('/auth/me').expect(401);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}x`)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token', async () => {
      const session = await register({ email: uniqueEmail(), password: PASSWORD });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(200);
      const rotated = authSessionSchema.parse(response.body);

      expect(rotated.refreshToken).not.toBe(session.refreshToken);
      expect(rotated.user.id).toBe(session.user.id);
    });

    it('revokes the whole login when a rotated token is reused', async () => {
      const session = await register({ email: uniqueEmail(), password: PASSWORD });
      const rotated = authSessionSchema.parse(
        (
          await request(app.getHttpServer())
            .post('/auth/refresh')
            .send({ refreshToken: session.refreshToken })
            .expect(200)
        ).body,
      );

      // An attacker replays the old token...
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      // ...so the legitimate newer token stops working too.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: rotated.refreshToken })
        .expect(401);
    });

    it('rejects an unknown or expired token', async () => {
      const session = await register({ email: uniqueEmail(), password: PASSWORD });
      await prisma.refreshToken.updateMany({
        where: { userId: session.user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('ends the session so its refresh token no longer works', async () => {
      const session = await register({ email: uniqueEmail(), password: PASSWORD });

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: session.refreshToken })
        .expect(204);
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
    });

    it('accepts an unknown token without revealing anything', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(204);
    });

    it('leaves other logins of the same user signed in', async () => {
      const email = uniqueEmail();
      const first = await register({ email, password: PASSWORD });
      const second = authSessionSchema.parse(
        (
          await request(app.getHttpServer())
            .post('/auth/login')
            .send({ identifier: email, password: PASSWORD })
            .expect(200)
        ).body,
      );

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: first.refreshToken })
        .expect(204);
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: second.refreshToken })
        .expect(200);
    });
  });
});
