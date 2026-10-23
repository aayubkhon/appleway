import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  Currency,
  Debt,
  DebtDetail,
  DebtListQuery,
  IsoDate,
  Payment,
  PaymentKind,
} from '@appleway/shared';

import { fromIsoDate, toIsoDate, toMinor } from '../common/db-values.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { checkDebtUpdate, checkPayment, compareDebts } from './ledger-rules.js';
import { LedgerRepository } from './ledger.repository.js';

export interface CreateDebtInput {
  customerId: string;
  amountMinor: number;
  currency: Currency;
  description?: string | null;
  issuedOn?: IsoDate;
  dueOn: IsoDate;
}

export interface UpdateDebtInput {
  amountMinor?: number;
  currency?: Currency;
  description?: string | null;
  issuedOn?: IsoDate;
  dueOn?: IsoDate;
}

export interface CreatePaymentInput {
  kind: PaymentKind;
  amountMinor: number;
  paidOn?: IsoDate;
  note?: string | null;
}

/** Business-rule failures carry a machine-readable reason for the app to translate. */
function unprocessable(reason: string, message: string): UnprocessableEntityException {
  return new UnprocessableEntityException({ message, reason });
}

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerRepository,
  ) {}

  async list(ownerId: string, query: DebtListQuery): Promise<Debt[]> {
    const today = await this.ledger.todayFor(ownerId);
    const debts = await this.ledger.debts(ownerId, today, { customerId: query.customerId });

    return debts
      .filter((debt) => query.status === undefined || debt.status === query.status)
      .sort(compareDebts);
  }

  async get(ownerId: string, id: string): Promise<DebtDetail> {
    const today = await this.ledger.todayFor(ownerId);
    const [debt] = await this.ledger.debts(ownerId, today, { debtId: id });

    if (debt === undefined) {
      throw new NotFoundException('debt not found');
    }

    const payments = await this.prisma.payment.findMany({
      where: { ownerId, debtId: id },
      orderBy: [{ paidOn: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      ...debt,
      payments: payments.map((payment): Payment => ({
        id: payment.id,
        kind: payment.kind,
        amountMinor: toMinor(payment.amountMinor),
        paidOn: toIsoDate(payment.paidOn),
        note: payment.note,
        createdAt: payment.createdAt.toISOString(),
      })),
    };
  }

  async create(ownerId: string, input: CreateDebtInput): Promise<DebtDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, ownerId },
      select: { id: true },
    });

    if (customer === null) {
      throw new NotFoundException('customer not found');
    }

    const issuedOn = input.issuedOn ?? (await this.ledger.todayFor(ownerId));
    if (input.dueOn < issuedOn) {
      throw unprocessable('DUE_BEFORE_ISSUE', 'due date cannot be before the issue date');
    }

    const row = await this.prisma.debt.create({
      data: {
        ownerId,
        customerId: customer.id,
        amountMinor: BigInt(input.amountMinor),
        currency: input.currency,
        description: input.description ?? null,
        issuedOn: fromIsoDate(issuedOn),
        dueOn: fromIsoDate(input.dueOn),
      },
    });

    return this.get(ownerId, row.id);
  }

  async update(ownerId: string, id: string, input: UpdateDebtInput): Promise<DebtDetail> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.debt.findFirst({ where: { id, ownerId } });
      if (row === null) {
        throw new NotFoundException('debt not found');
      }

      const firstPayment = await tx.payment.findFirst({
        where: { ownerId, debtId: id },
        orderBy: { paidOn: 'asc' },
        select: { paidOn: true },
      });

      const rejection = checkDebtUpdate({
        firstPaidOn: firstPayment === null ? null : toIsoDate(firstPayment.paidOn),
        current: {
          amountMinor: toMinor(row.amountMinor),
          currency: row.currency,
          issuedOn: toIsoDate(row.issuedOn),
          dueOn: toIsoDate(row.dueOn),
        },
        patch: input,
      });

      if (rejection === 'AMOUNT_LOCKED_BY_PAYMENTS') {
        throw new ConflictException({
          message: 'amount and currency cannot change after a payment',
          reason: rejection,
        });
      }
      if (rejection !== null) {
        throw unprocessable(rejection, 'dates are out of order');
      }

      await tx.debt.update({
        where: { id },
        data: {
          ...(input.amountMinor === undefined ? {} : { amountMinor: BigInt(input.amountMinor) }),
          ...(input.currency === undefined ? {} : { currency: input.currency }),
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.issuedOn === undefined ? {} : { issuedOn: fromIsoDate(input.issuedOn) }),
          ...(input.dueOn === undefined ? {} : { dueOn: fromIsoDate(input.dueOn) }),
        },
      });
    });

    return this.get(ownerId, id);
  }

  /** Only a debt nobody has paid on can go; payments are permanent history. */
  async remove(ownerId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.debt.findFirst({ where: { id, ownerId }, select: { id: true } });
      if (row === null) {
        throw new NotFoundException('debt not found');
      }

      if ((await tx.payment.count({ where: { ownerId, debtId: id } })) > 0) {
        throw new ConflictException({ message: 'debt has payments', reason: 'DEBT_HAS_PAYMENTS' });
      }

      await tx.debt.delete({ where: { id } });
    });
  }

  /**
   * Records a payment or correction. The debt row is locked for the duration,
   * so two payments arriving together cannot both pass the overpayment check.
   */
  async addPayment(
    ownerId: string,
    debtId: string,
    input: CreatePaymentInput,
  ): Promise<DebtDetail> {
    const today = await this.ledger.todayFor(ownerId);
    const paidOn = input.paidOn ?? today;

    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ amount_minor: bigint; issued_on: Date }[]>`
        SELECT amount_minor, issued_on FROM debts
        WHERE id = ${debtId}::uuid AND owner_id = ${ownerId}::uuid
        FOR UPDATE`;
      const debt = locked[0];

      if (debt === undefined) {
        throw new NotFoundException('debt not found');
      }

      const paid = await tx.payment.aggregate({
        where: { ownerId, debtId },
        _sum: { amountMinor: true },
      });

      const check = checkPayment({
        kind: input.kind,
        amountMinor: input.amountMinor,
        debtAmountMinor: toMinor(debt.amount_minor),
        paidMinor: toMinor(paid._sum.amountMinor ?? 0n),
        paidOn,
        issuedOn: toIsoDate(debt.issued_on),
        today,
      });

      if (!check.ok) {
        throw unprocessable(check.reason, 'payment rejected');
      }

      await tx.payment.create({
        data: {
          ownerId,
          debtId,
          kind: input.kind,
          amountMinor: BigInt(check.signedAmountMinor),
          paidOn: fromIsoDate(paidOn),
          note: input.note ?? null,
        },
      });
    });

    return this.get(ownerId, debtId);
  }
}
