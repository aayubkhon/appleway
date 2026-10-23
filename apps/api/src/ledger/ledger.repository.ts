import { Injectable, UnauthorizedException } from '@nestjs/common';
import { todayIn, type Debt, type IsoDate } from '@appleway/shared';

import { toIsoDate, toMinor } from '../common/db-values.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toDebtView } from './ledger-rules.js';

export interface DebtFilter {
  customerId?: string;
  debtId?: string;
}

/**
 * Reads ledger rows for one owner and turns them into computed views. Every
 * query here takes the owner id as its first argument and filters on it.
 */
@Injectable()
export class LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** "Today" in the owner's own timezone; statuses depend on it. */
  async todayFor(ownerId: string): Promise<IsoDate> {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { timezone: true },
    });

    if (owner === null) {
      throw new UnauthorizedException('account not found');
    }

    return todayIn(owner.timezone);
  }

  async debts(ownerId: string, today: IsoDate, filter: DebtFilter = {}): Promise<Debt[]> {
    const where: Prisma.DebtWhereInput = {
      ownerId,
      ...(filter.customerId === undefined ? {} : { customerId: filter.customerId }),
      ...(filter.debtId === undefined ? {} : { id: filter.debtId }),
    };

    const rows = await this.prisma.debt.findMany({
      where,
      include: { customer: { select: { name: true } } },
    });

    if (rows.length === 0) {
      return [];
    }

    const sums = await this.prisma.payment.groupBy({
      by: ['debtId'],
      where: { ownerId, debtId: { in: rows.map((row) => row.id) } },
      _sum: { amountMinor: true },
    });
    const paidByDebt = new Map(sums.map((sum) => [sum.debtId, sum._sum.amountMinor ?? 0n]));

    return rows.map((row) =>
      toDebtView(
        {
          id: row.id,
          customerId: row.customerId,
          customerName: row.customer.name,
          amountMinor: toMinor(row.amountMinor),
          currency: row.currency,
          description: row.description,
          issuedOn: toIsoDate(row.issuedOn),
          dueOn: toIsoDate(row.dueOn),
          createdAt: row.createdAt,
          paidMinor: toMinor(paidByDebt.get(row.id) ?? 0n),
        },
        today,
      ),
    );
  }
}
