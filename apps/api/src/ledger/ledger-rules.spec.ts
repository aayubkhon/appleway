import type { Debt } from '@appleway/shared';

import {
  balancesOf,
  checkDebtUpdate,
  checkPayment,
  compareDebts,
  mostUrgentStatus,
  summarize,
  toDebtView,
  type DebtRecord,
} from './ledger-rules.js';

const TODAY = '2026-10-23';

const record = (overrides: Partial<DebtRecord> = {}): DebtRecord => ({
  id: 'd1',
  customerId: 'c1',
  customerName: 'Aziz',
  amountMinor: 100_00,
  currency: 'USD',
  description: null,
  issuedOn: '2026-10-01',
  dueOn: '2026-10-30',
  createdAt: new Date('2026-10-01T09:00:00Z'),
  paidMinor: 0,
  ...overrides,
});

const debt = (overrides: Partial<DebtRecord> = {}): Debt => toDebtView(record(overrides), TODAY);

describe('ledger rules', () => {
  describe('toDebtView', () => {
    it('derives remaining and status from payments and the owner date', () => {
      expect(debt({ paidMinor: 40_00 })).toMatchObject({
        paidMinor: 40_00,
        remainingMinor: 60_00,
        status: 'UPCOMING',
      });
      expect(debt({ dueOn: TODAY }).status).toBe('DUE_TODAY');
      expect(debt({ dueOn: '2026-10-22' }).status).toBe('OVERDUE');
      expect(debt({ dueOn: '2026-10-22', paidMinor: 100_00 }).status).toBe('PAID');
    });
  });

  describe('compareDebts', () => {
    it('puts overdue first, paid last, earliest due date first within a status', () => {
      const debts = [
        debt({ id: 'paid', paidMinor: 100_00, dueOn: '2026-01-01' }),
        debt({ id: 'later', dueOn: '2026-12-01' }),
        debt({ id: 'today', dueOn: TODAY }),
        debt({ id: 'overdue-new', dueOn: '2026-10-20' }),
        debt({ id: 'overdue-old', dueOn: '2026-09-01' }),
        debt({ id: 'soon', dueOn: '2026-10-24' }),
      ];

      expect(debts.sort(compareDebts).map((d) => d.id)).toEqual([
        'overdue-old',
        'overdue-new',
        'today',
        'soon',
        'later',
        'paid',
      ]);
    });
  });

  describe('mostUrgentStatus', () => {
    it('ignores paid debts and returns null when nothing is owed', () => {
      expect(mostUrgentStatus([debt({ dueOn: TODAY }), debt({ dueOn: '2026-10-01' })])).toBe(
        'OVERDUE',
      );
      expect(mostUrgentStatus([debt({ paidMinor: 100_00 })])).toBeNull();
      expect(mostUrgentStatus([])).toBeNull();
    });
  });

  describe('balancesOf', () => {
    it('sums what is owed per currency and drops settled currencies', () => {
      expect(
        balancesOf([
          debt({ paidMinor: 25_00 }),
          debt({ amountMinor: 50_00 }),
          debt({ currency: 'UZS', amountMinor: 1_000_000_00, paidMinor: 1_000_000_00 }),
        ]),
      ).toEqual([{ currency: 'USD', remainingMinor: 125_00 }]);
    });
  });

  describe('summarize', () => {
    it('counts and totals open debts per status and currency', () => {
      const summary = summarize(
        [
          debt({ dueOn: '2026-10-01' }),
          debt({ dueOn: '2026-10-02', paidMinor: 30_00 }),
          debt({ dueOn: TODAY }),
          debt({ currency: 'UZS', amountMinor: 500_000_00 }),
          debt({ paidMinor: 100_00 }),
        ],
        TODAY,
      );

      expect(summary).toEqual({
        today: TODAY,
        currencies: [
          {
            currency: 'USD',
            overdue: { count: 2, remainingMinor: 170_00 },
            dueToday: { count: 1, remainingMinor: 100_00 },
            upcoming: { count: 0, remainingMinor: 0 },
          },
          {
            currency: 'UZS',
            overdue: { count: 0, remainingMinor: 0 },
            dueToday: { count: 0, remainingMinor: 0 },
            upcoming: { count: 1, remainingMinor: 500_000_00 },
          },
        ],
      });
    });
  });

  describe('checkPayment', () => {
    const base = {
      kind: 'PAYMENT' as const,
      amountMinor: 30_00,
      debtAmountMinor: 100_00,
      paidMinor: 50_00,
      paidOn: TODAY,
      issuedOn: '2026-10-01',
      today: TODAY,
    };

    it('accepts a payment up to the remainder', () => {
      expect(checkPayment({ ...base, amountMinor: 50_00 })).toEqual({
        ok: true,
        signedAmountMinor: 50_00,
      });
    });

    it('rejects an overpayment', () => {
      expect(checkPayment({ ...base, amountMinor: 50_01 })).toEqual({
        ok: false,
        reason: 'OVERPAYMENT',
      });
    });

    it('stores a correction as a negative amount, up to what was paid', () => {
      expect(checkPayment({ ...base, kind: 'CORRECTION', amountMinor: 50_00 })).toEqual({
        ok: true,
        signedAmountMinor: -50_00,
      });
      expect(checkPayment({ ...base, kind: 'CORRECTION', amountMinor: 50_01 })).toEqual({
        ok: false,
        reason: 'CORRECTION_EXCEEDS_PAID',
      });
    });

    it('rejects dates before the debt or after today', () => {
      expect(checkPayment({ ...base, paidOn: '2026-09-30' })).toEqual({
        ok: false,
        reason: 'PAID_BEFORE_ISSUE',
      });
      expect(checkPayment({ ...base, paidOn: '2026-10-24' })).toEqual({
        ok: false,
        reason: 'PAID_IN_FUTURE',
      });
    });
  });

  describe('checkDebtUpdate', () => {
    const current = {
      amountMinor: 100_00,
      currency: 'USD' as const,
      issuedOn: '2026-10-01',
      dueOn: '2026-10-30',
    };

    it('allows any change before the first payment', () => {
      expect(
        checkDebtUpdate({ firstPaidOn: null, current, patch: { amountMinor: 1, currency: 'UZS' } }),
      ).toBeNull();
    });

    it('freezes amount and currency once something was paid', () => {
      expect(
        checkDebtUpdate({ firstPaidOn: '2026-10-05', current, patch: { amountMinor: 90_00 } }),
      ).toBe('AMOUNT_LOCKED_BY_PAYMENTS');
      expect(
        checkDebtUpdate({ firstPaidOn: '2026-10-05', current, patch: { currency: 'UZS' } }),
      ).toBe('AMOUNT_LOCKED_BY_PAYMENTS');
    });

    it('still allows sending the unchanged amount and moving the due date', () => {
      expect(
        checkDebtUpdate({
          firstPaidOn: '2026-10-05',
          current,
          patch: { amountMinor: 100_00, dueOn: '2026-12-01' },
        }),
      ).toBeNull();
    });

    it('keeps the due date on or after the issue date', () => {
      expect(checkDebtUpdate({ firstPaidOn: null, current, patch: { dueOn: '2026-09-30' } })).toBe(
        'DUE_BEFORE_ISSUE',
      );
    });

    it('keeps the issue date on or before the first payment', () => {
      expect(
        checkDebtUpdate({ firstPaidOn: '2026-10-05', current, patch: { issuedOn: '2026-10-06' } }),
      ).toBe('ISSUE_AFTER_PAYMENT');
    });
  });
});
