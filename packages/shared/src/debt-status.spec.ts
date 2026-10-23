import { computeDebtStatus, computeRemainingMinor } from './debt-status';

describe('debt status', () => {
  describe('computeRemainingMinor', () => {
    it('subtracts every payment from the amount', () => {
      expect(computeRemainingMinor(100_00, [30_00, 20_00])).toBe(50_00);
    });

    it('is the full amount with no payments', () => {
      expect(computeRemainingMinor(100_00, [])).toBe(100_00);
    });

    it('adds a negative correction back to what is owed', () => {
      // 60 was recorded by mistake, then corrected by -40.
      expect(computeRemainingMinor(100_00, [60_00, -40_00])).toBe(80_00);
    });
  });

  describe('computeDebtStatus', () => {
    const today = '2026-10-23';

    it('is PAID when nothing remains, whatever the due date', () => {
      expect(computeDebtStatus({ remainingMinor: 0, dueOn: '2026-01-01', today })).toBe('PAID');
      expect(computeDebtStatus({ remainingMinor: 0, dueOn: '2027-01-01', today })).toBe('PAID');
    });

    it('is OVERDUE (Kechikkan) from the day after the due date', () => {
      expect(computeDebtStatus({ remainingMinor: 1, dueOn: '2026-10-22', today })).toBe('OVERDUE');
    });

    it('is DUE_TODAY (Bugun) on the due date', () => {
      expect(computeDebtStatus({ remainingMinor: 1, dueOn: today, today })).toBe('DUE_TODAY');
    });

    it('is UPCOMING before the due date', () => {
      expect(computeDebtStatus({ remainingMinor: 1, dueOn: '2026-10-24', today })).toBe('UPCOMING');
    });

    it('compares across month and year boundaries', () => {
      expect(
        computeDebtStatus({ remainingMinor: 5, dueOn: '2026-12-31', today: '2027-01-01' }),
      ).toBe('OVERDUE');
      expect(
        computeDebtStatus({ remainingMinor: 5, dueOn: '2026-11-01', today: '2026-10-31' }),
      ).toBe('UPCOMING');
    });
  });
});
