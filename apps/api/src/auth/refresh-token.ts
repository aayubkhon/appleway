import { createHash, randomBytes } from 'node:crypto';

const REFRESH_TOKEN_BYTES = 32;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Refresh tokens are opaque random strings, not JWTs: the server has to look
 * them up anyway to rotate and revoke them, so a signature adds nothing.
 */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

/**
 * Only this hash is stored. The token already has 256 bits of entropy, so a
 * fast hash is enough; a slow password hash would only cost CPU on refresh.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(issuedAt: Date, ttlDays: number): Date {
  return new Date(issuedAt.getTime() + ttlDays * MS_PER_DAY);
}
