import { z } from 'zod';

/**
 * A calendar date as "YYYY-MM-DD", with no time and no zone. Due dates are
 * agreed as days, so they are compared as days. ISO strings sort the same way
 * the dates do, so plain string comparison is correct.
 */
export type IsoDate = string;

export const isoDateSchema = z.iso.date();

export const DEFAULT_TIMEZONE = 'Asia/Tashkent';

/** True when the runtime knows the IANA zone name, e.g. "Asia/Tashkent". */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    // Intl signals an unknown zone only by throwing RangeError.
    return false;
  }
}

export const timeZoneSchema = z.string().refine(isValidTimeZone, 'unknown timezone');

/** The calendar date it is right now for someone living in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const part = (type: 'year' | 'month' | 'day'): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}
