import { z } from 'zod';

import type { IsoDate } from './calendar';
import { sumMinor, type MinorAmount } from './money';

/**
 * Debt status is derived, never stored and never accepted from a client.
 * The api computes it with these functions and sends the result.
 */
export const DEBT_STATUSES = ['PAID', 'OVERDUE', 'DUE_TODAY', 'UPCOMING'] as const;

export type DebtStatus = (typeof DEBT_STATUSES)[number];

export const debtStatusSchema = z.enum(DEBT_STATUSES);

/**
 * What is still owed: the debt amount minus every payment row. Correction rows
 * are negative, so they add back to the remainder. The api refuses payments
 * that would push this below zero; the value is returned as is so a broken
 * invariant stays visible instead of being clamped away.
 */
export function computeRemainingMinor(
  amountMinor: MinorAmount,
  paymentAmountsMinor: readonly number[],
): number {
  return amountMinor - sumMinor(paymentAmountsMinor);
}

export interface DebtStatusInput {
  remainingMinor: number;
  dueOn: IsoDate;
  /** Today's date in the owner's timezone, from `todayIn`. */
  today: IsoDate;
}

export function computeDebtStatus({ remainingMinor, dueOn, today }: DebtStatusInput): DebtStatus {
  if (remainingMinor <= 0) {
    return 'PAID';
  }
  if (dueOn < today) {
    return 'OVERDUE';
  }
  if (dueOn === today) {
    return 'DUE_TODAY';
  }
  return 'UPCOMING';
}
