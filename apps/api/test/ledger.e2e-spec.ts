import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  authSessionSchema,
  customerSchema,
  debtDetailSchema,
  debtSchema,
  ledgerSummarySchema,
  todayIn,
  type Customer,
  type DebtDetail,
} from '@appleway/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { z } from 'zod';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Hoisted because ConfigModule reads the environment when app.module is imported.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT_PER_MINUTE = '1000';
});

const TODAY = todayIn('Asia/Tashkent');

/** A calendar date `days` away from the owner's today. */
const shiftDays = (days: number): string => {
  const date = new Date(`${TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Runs against a real Postgres (docker compose up -d postgres). */
describe('ledger (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  /** A fresh account; returns a supertest agent factory bound to its token. */
  const signUp = async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `ledger-${randomUUID()}@e2e.appleway.test`, password: 'correct-horse-9' })
      .expect(201);
    const session = authSessionSchema.parse(response.body);
    createdUserIds.push(session.user.id);

    const auth = `Bearer ${session.accessToken}`;
    const server = app.getHttpServer();
    return {
      get: (path: string) => request(server).get(path).set('Authorization', auth),
      post: (path: string, body: object) =>
        request(server).post(path).set('Authorization', auth).send(body),
      patch: (path: string, body: object) =>
        request(server).patch(path).set('Authorization', auth).send(body),
      delete: (path: string) => request(server).delete(path).set('Authorization', auth),
    };
  };

  type Client = Awaited<ReturnType<typeof signUp>>;

  const createCustomer = async (client: Client, name = 'Aziz aka'): Promise<Customer> =>
    customerSchema.parse((await client.post('/customers', { name }).expect(201)).body);

  const createDebt = async (
    client: Client,
    customerId: string,
    body: object = {},
  ): Promise<DebtDetail> =>
    debtDetailSchema.parse(
      (
        await client
          .post('/debts', { customerId, amountMinor: 100_00, dueOn: shiftDays(7), ...body })
          .expect(201)
      ).body,
    );

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

  it('requires an access token on every ledger route', async () => {
    for (const path of ['/customers', '/debts', '/summary']) {
      await request(app.getHttpServer()).get(path).expect(401);
    }
  });

  describe('customers', () => {
    it('creates a customer with a normalised phone and an empty balance', async () => {
      const client = await signUp();

      const response = await client
        .post('/customers', { name: '  Dilnoza ', phone: '90 123 45 67', note: '' })
        .expect(201);

      expect(customerSchema.parse(response.body)).toMatchObject({
        name: 'Dilnoza',
        phone: '+998901234567',
        note: null,
        balances: [],
        openDebtCount: 0,
        status: null,
      });
    });

    it('lists customers with balances, most urgent first, and searches by name or phone', async () => {
      const client = await signUp();
      const calm = await createCustomer(client, 'Bobur');
      const late = await createCustomer(client, 'Zafar');
      await client.patch(`/customers/${late.id}`, { phone: '+998935550011' }).expect(200);
      await createDebt(client, calm.id);
      await createDebt(client, late.id, { issuedOn: shiftDays(-10), dueOn: shiftDays(-1) });

      const list = z.array(customerSchema).parse((await client.get('/customers').expect(200)).body);

      expect(list.map((c) => [c.name, c.status])).toEqual([
        ['Zafar', 'OVERDUE'],
        ['Bobur', 'UPCOMING'],
      ]);
      expect(list[0]?.balances).toEqual([{ currency: 'USD', remainingMinor: 100_00 }]);

      const byName = z
        .array(customerSchema)
        .parse((await client.get('/customers?q=bob').expect(200)).body);
      const byPhone = z
        .array(customerSchema)
        .parse((await client.get('/customers?q=93%20555').expect(200)).body);

      expect(byName.map((c) => c.name)).toEqual(['Bobur']);
      expect(byPhone.map((c) => c.name)).toEqual(['Zafar']);
    });

    it('updates and reads back a customer', async () => {
      const client = await signUp();
      const customer = await createCustomer(client);

      await client.patch(`/customers/${customer.id}`, { note: 'Doimiy mijoz' }).expect(200);
      const response = await client.get(`/customers/${customer.id}`).expect(200);

      expect(customerSchema.parse(response.body).note).toBe('Doimiy mijoz');
    });

    it('deletes a customer without debts but refuses one with debts', async () => {
      const client = await signUp();
      const empty = await createCustomer(client, 'Empty');
      const owing = await createCustomer(client, 'Owing');
      await createDebt(client, owing.id);

      await client.delete(`/customers/${empty.id}`).expect(204);
      await client.get(`/customers/${empty.id}`).expect(404);

      const refused = await client.delete(`/customers/${owing.id}`).expect(409);
      expect(refused.body).toMatchObject({ reason: 'CUSTOMER_HAS_DEBTS' });
    });

    it('rejects a malformed id with 400', async () => {
      const client = await signUp();

      await client.get('/customers/not-a-uuid').expect(400);
    });
  });

  describe('debts', () => {
    it('creates a debt issued today by default and computes its status', async () => {
      const client = await signUp();
      const customer = await createCustomer(client);

      const debt = await createDebt(client, customer.id, { currency: 'UZS', dueOn: TODAY });

      expect(debt).toMatchObject({
        customerName: 'Aziz aka',
        currency: 'UZS',
        issuedOn: TODAY,
        dueOn: TODAY,
        paidMinor: 0,
        remainingMinor: 100_00,
        status: 'DUE_TODAY',
        payments: [],
      });
    });

    it('rejects a due date before the default issue date', async () => {
      const client = await signUp();
      const customer = await createCustomer(client);

      const response = await client
        .post('/debts', { customerId: customer.id, amountMinor: 1_00, dueOn: shiftDays(-1) })
        .expect(422);

      expect(response.body).toMatchObject({ reason: 'DUE_BEFORE_ISSUE' });
    });

    it('lists debts most urgent first and filters by status and customer', async () => {
      const client = await signUp();
      const a = await createCustomer(client, 'A');
      const b = await createCustomer(client, 'B');
      await createDebt(client, a.id, { dueOn: shiftDays(30) });
      await createDebt(client, a.id, { issuedOn: shiftDays(-20), dueOn: shiftDays(-2) });
      await createDebt(client, b.id, { dueOn: TODAY });

      const all = z.array(debtSchema).parse((await client.get('/debts').expect(200)).body);
      const overdue = z
        .array(debtSchema)
        .parse((await client.get('/debts?status=OVERDUE').expect(200)).body);
      const ofB = z
        .array(debtSchema)
        .parse((await client.get(`/debts?customerId=${b.id}`).expect(200)).body);

      expect(all.map((d) => d.status)).toEqual(['OVERDUE', 'DUE_TODAY', 'UPCOMING']);
      expect(overdue).toHaveLength(1);
      expect(ofB.map((d) => d.customerName)).toEqual(['B']);
      await client.get('/debts?status=LATE').expect(400);
    });

    it('edits freely before a payment, then freezes amount and currency', async () => {
      const client = await signUp();
      const customer = await createCustomer(client);
      const debt = await createDebt(client, customer.id);

      await client.patch(`/debts/${debt.id}`, { amountMinor: 120_00 }).expect(200);
      await client.post(`/debts/${debt.id}/payments`, { amountMinor: 20_00 }).expect(201);

      const locked = await client.patch(`/debts/${debt.id}`, { amountMinor: 90_00 }).expect(409);
      expect(locked.body).toMatchObject({ reason: 'AMOUNT_LOCKED_BY_PAYMENTS' });

      const moved = await client
        .patch(`/debts/${debt.id}`, { dueOn: shiftDays(60), description: 'Muzlatkich' })
        .expect(200);
      expect(debtDetailSchema.parse(moved.body)).toMatchObject({
        amountMinor: 120_00,
        dueOn: shiftDays(60),
        description: 'Muzlatkich',
      });
    });

    it('deletes an unpaid debt but refuses one with payments', async () => {
      const client = await signUp();
      const customer = await createCustomer(client);
      const unpaid = await createDebt(client, customer.id);
      const paid = await createDebt(client, customer.id);
      await client.post(`/debts/${paid.id}/payments`, { amountMinor: 1_00 }).expect(201);

      await client.delete(`/debts/${unpaid.id}`).expect(204);
      const refused = await client.delete(`/debts/${paid.id}`).expect(409);

      expect(refused.body).toMatchObject({ reason: 'DEBT_HAS_PAYMENTS' });
    });
  });

  describe('payments', () => {
    it('reduces the remainder until the debt is paid', async () => {
      const client = await signUp();
      const customer = await createCustomer(client);
      const debt = await createDebt(client, customer.id, {
        issuedOn: shiftDays(-10),
        dueOn: shiftDays(-1),
      });

      const partial = debtDetailSchema.parse(
        (await client.post(`/debts/${debt.id}/payments`, { amountMinor: 40_00 }).expect(201)).body,
      );
      expect(partial).toMatchObject({ remainingMinor: 60_00, status: 'OVERDUE' });

      const settled = debtDetailSchema.parse(
        (
          await client
            .post(`/debts/${debt.id}/payments`, { amountMinor: 60_00, note: 'Naqd' })
            .expect(201)
        ).body,
      );
      expect(settled).toMatchObject({ paidMinor: 100_00, remainingMinor: 0, status: 'PAID' });
      expect(settled.payments.map((p) => [p.kind, p.amountMinor, p.paidOn])).toEqual([
        ['PAYMENT', 40_00, TODAY],
        ['PAYMENT', 60_00, TODAY],
      ]);
    });

    it('rejects an overpayment', async () => {
      const client = await signUp();
      const debt = await createDebt(client, (await createCustomer(client)).id);

      const response = await client
        .post(`/debts/${debt.id}/payments`, { amountMinor: 100_01 })
        .expect(422);

      expect(response.body).toMatchObject({ reason: 'OVERPAYMENT' });
    });

    it('records a correction as a negative row, never more than was paid', async () => {
      const client = await signUp();
      const debt = await createDebt(client, (await createCustomer(client)).id);
      await client.post(`/debts/${debt.id}/payments`, { amountMinor: 70_00 }).expect(201);

      const corrected = debtDetailSchema.parse(
        (
          await client
            .post(`/debts/${debt.id}/payments`, { kind: 'CORRECTION', amountMinor: 20_00 })
            .expect(201)
        ).body,
      );
      expect(corrected.remainingMinor).toBe(50_00);
      expect(corrected.payments.at(-1)).toMatchObject({ kind: 'CORRECTION', amountMinor: -20_00 });

      const tooMuch = await client
        .post(`/debts/${debt.id}/payments`, { kind: 'CORRECTION', amountMinor: 50_01 })
        .expect(422);
      expect(tooMuch.body).toMatchObject({ reason: 'CORRECTION_EXCEEDS_PAID' });
    });

    it('rejects payment dates in the future or before the debt', async () => {
      const client = await signUp();
      const debt = await createDebt(client, (await createCustomer(client)).id);

      const future = await client
        .post(`/debts/${debt.id}/payments`, { amountMinor: 1_00, paidOn: shiftDays(1) })
        .expect(422);
      const early = await client
        .post(`/debts/${debt.id}/payments`, { amountMinor: 1_00, paidOn: shiftDays(-1) })
        .expect(422);

      expect(future.body).toMatchObject({ reason: 'PAID_IN_FUTURE' });
      expect(early.body).toMatchObject({ reason: 'PAID_BEFORE_ISSUE' });
    });

    it('never lets concurrent payments overpay', async () => {
      const client = await signUp();
      const debt = await createDebt(client, (await createCustomer(client)).id);

      const statuses = (
        await Promise.all(
          Array.from({ length: 5 }, () =>
            client.post(`/debts/${debt.id}/payments`, { amountMinor: 30_00 }),
          ),
        )
      )
        .map((response) => response.status)
        .sort();

      expect(statuses).toEqual([201, 201, 201, 422, 422]);
      const final = debtDetailSchema.parse(
        (await client.get(`/debts/${debt.id}`).expect(200)).body,
      );
      expect(final.remainingMinor).toBe(10_00);
    });
  });

  describe('summary', () => {
    it('totals open debts per status and currency', async () => {
      const client = await signUp();
      const customer = await createCustomer(client);
      await createDebt(client, customer.id, { issuedOn: shiftDays(-5), dueOn: shiftDays(-1) });
      await createDebt(client, customer.id, { dueOn: TODAY, amountMinor: 25_00 });
      const settled = await createDebt(client, customer.id);
      await client.post(`/debts/${settled.id}/payments`, { amountMinor: 100_00 }).expect(201);

      const summary = ledgerSummarySchema.parse((await client.get('/summary').expect(200)).body);

      expect(summary).toEqual({
        today: TODAY,
        currencies: [
          {
            currency: 'USD',
            overdue: { count: 1, remainingMinor: 100_00 },
            dueToday: { count: 1, remainingMinor: 25_00 },
            upcoming: { count: 0, remainingMinor: 0 },
          },
        ],
      });
    });
  });

  describe('owner isolation', () => {
    it('never shows or changes another account’s rows', async () => {
      const owner = await signUp();
      const intruder = await signUp();
      const customer = await createCustomer(owner);
      const debt = await createDebt(owner, customer.id);

      expect((await intruder.get('/customers').expect(200)).body).toEqual([]);
      expect((await intruder.get('/debts').expect(200)).body).toEqual([]);
      expect(
        ledgerSummarySchema.parse((await intruder.get('/summary').expect(200)).body).currencies,
      ).toEqual([]);

      await intruder.get(`/customers/${customer.id}`).expect(404);
      await intruder.patch(`/customers/${customer.id}`, { name: 'Hacked' }).expect(404);
      await intruder.delete(`/customers/${customer.id}`).expect(404);
      await intruder.get(`/debts/${debt.id}`).expect(404);
      await intruder.patch(`/debts/${debt.id}`, { dueOn: shiftDays(90) }).expect(404);
      await intruder.delete(`/debts/${debt.id}`).expect(404);
      await intruder.post(`/debts/${debt.id}/payments`, { amountMinor: 1_00 }).expect(404);
      await intruder
        .post('/debts', { customerId: customer.id, amountMinor: 1_00, dueOn: shiftDays(1) })
        .expect(404);

      const untouched = debtDetailSchema.parse(
        (await owner.get(`/debts/${debt.id}`).expect(200)).body,
      );
      expect(untouched).toMatchObject({ customerName: 'Aziz aka', paidMinor: 0 });
    });
  });
});
