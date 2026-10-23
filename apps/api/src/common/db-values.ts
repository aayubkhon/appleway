import type { IsoDate } from '@appleway/shared';

/**
 * Conversions at the Prisma boundary. Postgres DATE columns come back as a
 * Date at UTC midnight, and BIGINT money comes back as bigint; the rest of the
 * api works with "YYYY-MM-DD" strings and plain numbers.
 */

export function toIsoDate(value: Date): IsoDate {
  return value.toISOString().slice(0, 10);
}

export function fromIsoDate(value: IsoDate): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Throws rather than silently losing cents if a value outgrows a JS number. */
export function toMinor(value: bigint): number {
  const minor = Number(value);
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError('money amount exceeds the safe integer range');
  }
  return minor;
}
