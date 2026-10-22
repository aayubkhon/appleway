import { z } from 'zod';

/**
 * Currencies the ledger can record. USD is the product default; the others exist
 * so a record can be stored in the currency it was actually agreed in.
 */
export const CURRENCIES = ['USD', 'UZS'] as const;

export type Currency = (typeof CURRENCIES)[number];

export const currencySchema = z.enum(CURRENCIES);

export const DEFAULT_CURRENCY: Currency = 'USD';

/** How many minor units make one major unit, per currency. */
const MINOR_UNITS_PER_MAJOR: Record<Currency, number> = {
  USD: 100,
  UZS: 100,
};

/**
 * Money is always stored and moved around as a whole number of minor units
 * (cents / tiyin). Never as a float.
 */
export const minorAmountSchema = z
  .number()
  .int('amount must be a whole number of minor units')
  .nonnegative('amount cannot be negative');

/** A money amount that may be zero or positive, in minor units. */
export type MinorAmount = number;

export function minorUnitsPerMajor(currency: Currency): number {
  return MINOR_UNITS_PER_MAJOR[currency];
}

/**
 * Parses user input typed in major units ("1 250.75") into minor units.
 * Returns null when the text is not a usable amount, so callers decide how to
 * report it instead of receiving a silent zero.
 */
export function parseMajorToMinor(input: string, currency: Currency): MinorAmount | null {
  const normalised = input.replace(/\s| /g, '').replace(',', '.');
  if (normalised === '' || !/^\d*(\.\d*)?$/.test(normalised)) {
    return null;
  }

  const [whole = '', fraction = ''] = normalised.split('.');
  const factor = minorUnitsPerMajor(currency);
  const fractionDigits = String(factor).length - 1;
  if (fraction.length > fractionDigits) {
    return null;
  }

  const paddedFraction = fraction.padEnd(fractionDigits, '0');
  const wholeMinor = (whole === '' ? 0 : Number(whole)) * factor;
  const fractionMinor = paddedFraction === '' ? 0 : Number(paddedFraction);

  if (!Number.isSafeInteger(wholeMinor + fractionMinor)) {
    return null;
  }

  return wholeMinor + fractionMinor;
}

/** Splits minor units into the whole and fractional parts of the major unit. */
export function splitMinor(
  amountMinor: MinorAmount,
  currency: Currency,
): { major: number; minor: number } {
  const factor = minorUnitsPerMajor(currency);
  return {
    major: Math.trunc(amountMinor / factor),
    minor: amountMinor % factor,
  };
}

/** Adds minor amounts with integer math only. */
export function sumMinor(amounts: readonly MinorAmount[]): MinorAmount {
  return amounts.reduce((total, amount) => total + amount, 0);
}
