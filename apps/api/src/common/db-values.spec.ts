import { fromIsoDate, toIsoDate, toMinor } from './db-values.js';

describe('db values', () => {
  it('round-trips calendar dates without shifting the day', () => {
    expect(toIsoDate(fromIsoDate('2026-12-31'))).toBe('2026-12-31');
    expect(fromIsoDate('2026-10-23').toISOString()).toBe('2026-10-23T00:00:00.000Z');
  });

  it('converts bigint money and refuses values a number cannot hold exactly', () => {
    expect(toMinor(12_345n)).toBe(12_345);
    expect(toMinor(-500n)).toBe(-500);
    expect(() => toMinor(2n ** 60n)).toThrow(RangeError);
  });
});
