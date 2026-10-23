import { isoDateSchema, isValidTimeZone, timeZoneSchema, todayIn } from './calendar';

describe('calendar', () => {
  describe('todayIn', () => {
    it('returns the date in the given zone, not in UTC', () => {
      // 19:30 UTC is already 00:30 the next day in Tashkent (UTC+5).
      const now = new Date('2026-10-23T19:30:00Z');

      expect(todayIn('Asia/Tashkent', now)).toBe('2026-10-24');
      expect(todayIn('UTC', now)).toBe('2026-10-23');
    });

    it('stays on the same day until local midnight', () => {
      expect(todayIn('Asia/Tashkent', new Date('2026-10-23T18:59:59Z'))).toBe('2026-10-23');
      expect(todayIn('Asia/Tashkent', new Date('2026-10-23T19:00:00Z'))).toBe('2026-10-24');
    });

    it('handles zones behind UTC across a year boundary', () => {
      expect(todayIn('America/New_York', new Date('2027-01-01T03:00:00Z'))).toBe('2026-12-31');
    });
  });

  describe('timezones', () => {
    it('accepts IANA names and rejects anything else', () => {
      expect(isValidTimeZone('Asia/Tashkent')).toBe(true);
      expect(isValidTimeZone('Mars/Olympus')).toBe(false);
      expect(timeZoneSchema.safeParse('').success).toBe(false);
    });
  });

  describe('isoDateSchema', () => {
    it('accepts calendar dates only', () => {
      expect(isoDateSchema.safeParse('2026-02-28').success).toBe(true);
      expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
      expect(isoDateSchema.safeParse('2026-02-28T00:00:00Z').success).toBe(false);
    });
  });
});
