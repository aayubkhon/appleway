import {
  CURRENCIES,
  computeDebtStatus,
  computeRemainingMinor,
  type Balance,
  type Currency,
  type Debt,
  type DebtStatus,
  type IsoDate,
  type LedgerSummary,
  type PaymentKind,
  type StatusTotal,
} from '@appleway/shared';

/**
 * Ledger business rules with no Nest or Prisma in sight, so every rule the
 * product depends on is unit-tested directly.
 */

export interface DebtRecord {
  id: string;
  customerId: string;
  customerName: string;
  amountMinor: number;
  currency: Currency;
  description: string | null;
  issuedOn: IsoDate;
  dueOn: IsoDate;
  createdAt: Date;
  /** Sum of every payment row, corrections included. */
  paidMinor: number;
}

export function toDebtView(record: DebtRecord, today: IsoDate): Debt {
  const remainingMinor = computeRemainingMinor(record.amountMinor, [record.paidMinor]);

  return {
    id: record.id,
    customerId: record.customerId,
    customerName: record.customerName,
    amountMinor: record.amountMinor,
    currency: record.currency,
    description: record.description,
    issuedOn: record.issuedOn,
    dueOn: record.dueOn,
    paidMinor: record.paidMinor,
    remainingMinor,
    status: computeDebtStatus({ remainingMinor, dueOn: record.dueOn, today }),
    createdAt: record.createdAt.toISOString(),
  };
}

/** Lower is more urgent. */
const STATUS_PRIORITY: Record<DebtStatus, number> = {
  OVERDUE: 0,
  DUE_TODAY: 1,
  UPCOMING: 2,
  PAID: 3,
};

/** Most urgent first, then the earliest due date, then the oldest record. */
export function compareDebts(a: Debt, b: Debt): number {
  return (
    STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
    a.dueOn.localeCompare(b.dueOn) ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

/** The most urgent status among debts still owed, or null when nothing is owed. */
export function mostUrgentStatus(debts: readonly Debt[]): DebtStatus | null {
  return debts
    .map((debt) => debt.status)
    .filter((status) => status !== 'PAID')
    .reduce<DebtStatus | null>(
      (worst, status) =>
        worst === null || STATUS_PRIORITY[status] < STATUS_PRIORITY[worst] ? status : worst,
      null,
    );
}

/** What is still owed, per currency, in a stable currency order. */
export function balancesOf(debts: readonly Debt[]): Balance[] {
  return CURRENCIES.map((currency) => ({
    currency,
    remainingMinor: debts
      .filter((debt) => debt.currency === currency && debt.status !== 'PAID')
      .reduce((total, debt) => total + debt.remainingMinor, 0),
  })).filter((balance) => balance.remainingMinor > 0);
}

const emptyTotal = (): StatusTotal => ({ count: 0, remainingMinor: 0 });

export function summarize(debts: readonly Debt[], today: IsoDate): LedgerSummary {
  const currencies = CURRENCIES.map((currency) => {
    const totals = {
      currency,
      overdue: emptyTotal(),
      dueToday: emptyTotal(),
      upcoming: emptyTotal(),
    };

    for (const debt of debts) {
      if (debt.currency !== currency) {
        continue;
      }
      const bucket =
        debt.status === 'OVERDUE'
          ? totals.overdue
          : debt.status === 'DUE_TODAY'
            ? totals.dueToday
            : debt.status === 'UPCOMING'
              ? totals.upcoming
              : null;
      if (bucket !== null) {
        bucket.count += 1;
        bucket.remainingMinor += debt.remainingMinor;
      }
    }

    return totals;
  }).filter((totals) => totals.overdue.count + totals.dueToday.count + totals.upcoming.count > 0);

  return { today, currencies };
}

export type PaymentRejection =
  'OVERPAYMENT' | 'CORRECTION_EXCEEDS_PAID' | 'PAID_BEFORE_ISSUE' | 'PAID_IN_FUTURE';

export interface PaymentCheckInput {
  kind: PaymentKind;
  /** As requested: always positive. */
  amountMinor: number;
  debtAmountMinor: number;
  paidMinor: number;
  paidOn: IsoDate;
  issuedOn: IsoDate;
  today: IsoDate;
}

export type PaymentCheck =
  { ok: true; signedAmountMinor: number } | { ok: false; reason: PaymentRejection };

/**
 * A payment may not push the remainder below zero, and a correction may not
 * undo more than was paid, so 0 <= remaining <= amount always holds.
 */
export function checkPayment(input: PaymentCheckInput): PaymentCheck {
  if (input.paidOn < input.issuedOn) {
    return { ok: false, reason: 'PAID_BEFORE_ISSUE' };
  }
  if (input.paidOn > input.today) {
    return { ok: false, reason: 'PAID_IN_FUTURE' };
  }

  if (input.kind === 'PAYMENT') {
    const remainingMinor = input.debtAmountMinor - input.paidMinor;
    return input.amountMinor > remainingMinor
      ? { ok: false, reason: 'OVERPAYMENT' }
      : { ok: true, signedAmountMinor: input.amountMinor };
  }

  return input.amountMinor > input.paidMinor
    ? { ok: false, reason: 'CORRECTION_EXCEEDS_PAID' }
    : { ok: true, signedAmountMinor: -input.amountMinor };
}

export type DebtUpdateRejection =
  'AMOUNT_LOCKED_BY_PAYMENTS' | 'DUE_BEFORE_ISSUE' | 'ISSUE_AFTER_PAYMENT';

export interface DebtUpdateCheckInput {
  /** Earliest payment date, or null when nothing has been paid. */
  firstPaidOn: IsoDate | null;
  current: { amountMinor: number; currency: Currency; issuedOn: IsoDate; dueOn: IsoDate };
  patch: { amountMinor?: number; currency?: Currency; issuedOn?: IsoDate; dueOn?: IsoDate };
}

/**
 * Amount and currency are frozen once money has moved: changing them would
 * rewrite what earlier payments were measured against.
 */
export function checkDebtUpdate({
  firstPaidOn,
  current,
  patch,
}: DebtUpdateCheckInput): DebtUpdateRejection | null {
  const changesMoney =
    (patch.amountMinor !== undefined && patch.amountMinor !== current.amountMinor) ||
    (patch.currency !== undefined && patch.currency !== current.currency);

  if (firstPaidOn !== null && changesMoney) {
    return 'AMOUNT_LOCKED_BY_PAYMENTS';
  }

  const issuedOn = patch.issuedOn ?? current.issuedOn;
  const dueOn = patch.dueOn ?? current.dueOn;

  if (dueOn < issuedOn) {
    return 'DUE_BEFORE_ISSUE';
  }
  if (firstPaidOn !== null && issuedOn > firstPaidOn) {
    return 'ISSUE_AFTER_PAYMENT';
  }
  return null;
}
