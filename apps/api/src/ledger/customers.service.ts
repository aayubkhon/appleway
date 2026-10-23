import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Customer, Debt } from '@appleway/shared';

import type { Customer as CustomerRow, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { balancesOf, mostUrgentStatus } from './ledger-rules.js';
import { LedgerRepository } from './ledger.repository.js';

export interface CustomerInput {
  name?: string;
  phone?: string | null;
  note?: string | null;
}

const STATUS_ORDER = ['OVERDUE', 'DUE_TODAY', 'UPCOMING'] as const;

function toCustomerView(row: CustomerRow, debts: readonly Debt[]): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    note: row.note,
    balances: balancesOf(debts),
    openDebtCount: debts.filter((debt) => debt.status !== 'PAID').length,
    status: mostUrgentStatus(debts),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Customers who owe something urgent come first, then alphabetical. */
function compareCustomers(a: Customer, b: Customer): number {
  const rank = (customer: Customer): number =>
    customer.status === null || customer.status === 'PAID'
      ? STATUS_ORDER.length
      : STATUS_ORDER.indexOf(customer.status);

  return rank(a) - rank(b) || a.name.localeCompare(b.name);
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerRepository,
  ) {}

  async list(ownerId: string, search?: string): Promise<Customer[]> {
    const where: Prisma.CustomerWhereInput = { ownerId };
    if (search !== undefined && search !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search.replace(/\D/g, '') || search } },
      ];
    }

    const [rows, today] = await Promise.all([
      this.prisma.customer.findMany({ where }),
      this.ledger.todayFor(ownerId),
    ]);
    const debts = await this.ledger.debts(ownerId, today);

    return rows
      .map((row) =>
        toCustomerView(
          row,
          debts.filter((debt) => debt.customerId === row.id),
        ),
      )
      .sort(compareCustomers);
  }

  async get(ownerId: string, id: string): Promise<Customer> {
    const row = await this.prisma.customer.findFirst({ where: { id, ownerId } });

    if (row === null) {
      throw new NotFoundException('customer not found');
    }

    const today = await this.ledger.todayFor(ownerId);
    return toCustomerView(row, await this.ledger.debts(ownerId, today, { customerId: id }));
  }

  async create(
    ownerId: string,
    input: Required<Pick<CustomerInput, 'name'>> & CustomerInput,
  ): Promise<Customer> {
    const row = await this.prisma.customer.create({
      data: { ownerId, name: input.name, phone: input.phone ?? null, note: input.note ?? null },
    });

    return toCustomerView(row, []);
  }

  async update(ownerId: string, id: string, input: CustomerInput): Promise<Customer> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, ownerId },
      data: input,
    });

    if (count === 0) {
      throw new NotFoundException('customer not found');
    }

    return this.get(ownerId, id);
  }

  /** Only a customer with no debts can go; debts are the ledger's history. */
  async remove(ownerId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id, ownerId },
        select: { id: true },
      });
      if (customer === null) {
        throw new NotFoundException('customer not found');
      }

      if ((await tx.debt.count({ where: { customerId: id, ownerId } })) > 0) {
        throw new ConflictException({
          message: 'customer has debts',
          reason: 'CUSTOMER_HAS_DEBTS',
        });
      }

      await tx.customer.delete({ where: { id } });
    });
  }
}
