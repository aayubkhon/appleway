import { validateEnv } from './env.js';

describe('validateEnv', () => {
  const valid = { DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' };

  it('applies defaults for optional values', () => {
    const env = validateEnv(valid);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.DEFAULT_TIMEZONE).toBe('Asia/Tashkent');
  });

  it('coerces PORT from a string', () => {
    expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('fails on an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
