import { z } from 'zod';

/** Uzbekistan country code, assumed when a number is typed without one. */
const DEFAULT_COUNTRY_CODE = '998';
const LOCAL_NUMBER_LENGTH = 9;

/**
 * Turns what people type ("90 123-45-67", "+998 (90) 123 45 67") into E.164
 * ("+998901234567"). A bare 9-digit number is treated as Uzbek. Returns null
 * when the input cannot be a phone number.
 */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  const withCountry =
    digits.length === LOCAL_NUMBER_LENGTH ? `${DEFAULT_COUNTRY_CODE}${digits}` : digits;

  return /^[1-9]\d{8,14}$/.test(withCountry) ? `+${withCountry}` : null;
}

export const phoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizePhone(value);
  if (phone === null) {
    ctx.addIssue({ code: 'custom', message: 'invalid phone number' });
    return z.NEVER;
  }
  return phone;
});

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('invalid email').max(254));

export const PASSWORD_MIN_LENGTH = 8;
/** argon2 accepts more, but a cap stops a megabyte "password" from tying up a CPU. */
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'password too short')
  .max(PASSWORD_MAX_LENGTH, 'password too long');

export const registerRequestSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
  })
  .refine((value) => value.phone !== undefined || value.email !== undefined, {
    message: 'phone or email is required',
    path: ['phone'],
  });

export type RegisterRequest = z.input<typeof registerRequestSchema>;

/** One field for both: anything with "@" is an email, the rest is a phone. */
export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export type LoginIdentifier = { kind: 'email'; email: string } | { kind: 'phone'; phone: string };

export function parseLoginIdentifier(identifier: string): LoginIdentifier | null {
  if (identifier.includes('@')) {
    const email = emailSchema.safeParse(identifier);
    return email.success ? { kind: 'email', email: email.data } : null;
  }

  const phone = normalizePhone(identifier);
  return phone === null ? null : { kind: 'phone', phone };
}

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const userProfileSchema = z.object({
  id: z.uuid(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  timezone: z.string(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const authSessionSchema = z.object({
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  accessTokenExpiresIn: z.number().int().positive(),
  refreshToken: z.string(),
  user: userProfileSchema,
});

export type AuthSession = z.infer<typeof authSessionSchema>;
