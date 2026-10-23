import {
  emailSchema,
  loginRequestSchema,
  normalizePhone,
  parseLoginIdentifier,
  registerRequestSchema,
} from './auth';

describe('auth schemas', () => {
  describe('normalizePhone', () => {
    it('keeps E.164 numbers and strips formatting', () => {
      expect(normalizePhone('+998 (90) 123-45-67')).toBe('+998901234567');
      expect(normalizePhone('998901234567')).toBe('+998901234567');
    });

    it('treats a bare 9-digit number as Uzbek', () => {
      expect(normalizePhone('90 123 45 67')).toBe('+998901234567');
    });

    it('rejects text and impossible lengths', () => {
      expect(normalizePhone('call me')).toBeNull();
      expect(normalizePhone('12345')).toBeNull();
      expect(normalizePhone('+0998901234567')).toBeNull();
      expect(normalizePhone('')).toBeNull();
    });
  });

  it('lower-cases and trims email', () => {
    expect(emailSchema.parse('  Seller@Example.COM ')).toBe('seller@example.com');
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  describe('registerRequestSchema', () => {
    it('accepts phone only or email only', () => {
      expect(registerRequestSchema.parse({ phone: '901234567', password: 'secret123' })).toEqual({
        phone: '+998901234567',
        password: 'secret123',
      });
      expect(
        registerRequestSchema.safeParse({ email: 'a@b.uz', password: 'secret123' }).success,
      ).toBe(true);
    });

    it('requires phone or email', () => {
      expect(registerRequestSchema.safeParse({ password: 'secret123' }).success).toBe(false);
    });

    it('enforces password length', () => {
      expect(registerRequestSchema.safeParse({ email: 'a@b.uz', password: 'short' }).success).toBe(
        false,
      );
      expect(
        registerRequestSchema.safeParse({ email: 'a@b.uz', password: 'x'.repeat(129) }).success,
      ).toBe(false);
    });
  });

  describe('parseLoginIdentifier', () => {
    it('routes by the presence of @', () => {
      expect(parseLoginIdentifier('A@B.uz')).toEqual({ kind: 'email', email: 'a@b.uz' });
      expect(parseLoginIdentifier('90 123 45 67')).toEqual({
        kind: 'phone',
        phone: '+998901234567',
      });
    });

    it('returns null for unusable input', () => {
      expect(parseLoginIdentifier('@')).toBeNull();
      expect(parseLoginIdentifier('abc')).toBeNull();
    });
  });

  it('login requires both fields', () => {
    expect(loginRequestSchema.safeParse({ identifier: '', password: 'x' }).success).toBe(false);
  });
});
