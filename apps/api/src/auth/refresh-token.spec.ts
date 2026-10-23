import { generateRefreshToken, hashRefreshToken, refreshTokenExpiry } from './refresh-token.js';

describe('refresh token helpers', () => {
  it('generates distinct url-safe tokens', () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes deterministically without keeping the token', () => {
    const token = generateRefreshToken();

    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRefreshToken(token)).not.toContain(token);
  });

  it('expires the given number of days later', () => {
    const issuedAt = new Date('2026-10-23T10:00:00Z');

    expect(refreshTokenExpiry(issuedAt, 30).toISOString()).toBe('2026-11-22T10:00:00.000Z');
  });
});
