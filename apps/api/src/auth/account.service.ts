import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AccountExport } from '@appleway/shared';
import argon2 from 'argon2';

import { toIsoDate, toMinor } from '../common/db-values.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** The account rights app stores require: take your data with you, or erase it. */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Erases the user and, through ON DELETE CASCADE, every customer, debt,
   * payment and refresh token they own. There is no soft delete to undo.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (user === null || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('invalid credentials');
    }

    await this.prisma.user.delete({ where: { id: userId } });
  }

  async exportData(userId: string): Promise<AccountExport> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user === null) {
      throw new UnauthorizedException('account not found');
    }

    const [customers, debts, payments] = await Promise.all([
      this.prisma.customer.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.debt.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.payment.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        timezone: user.timezone,
        createdAt: user.createdAt.toISOString(),
      },
      customers: customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        note: customer.note,
        createdAt: customer.createdAt.toISOString(),
      })),
      debts: debts.map((debt) => ({
        id: debt.id,
        customerId: debt.customerId,
        amountMinor: toMinor(debt.amountMinor),
        currency: debt.currency,
        description: debt.description,
        issuedOn: toIsoDate(debt.issuedOn),
        dueOn: toIsoDate(debt.dueOn),
        createdAt: debt.createdAt.toISOString(),
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        debtId: payment.debtId,
        kind: payment.kind,
        amountMinor: toMinor(payment.amountMinor),
        paidOn: toIsoDate(payment.paidOn),
        note: payment.note,
        createdAt: payment.createdAt.toISOString(),
      })),
    };
  }
}
