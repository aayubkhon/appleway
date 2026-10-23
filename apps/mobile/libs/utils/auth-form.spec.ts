import { validateSignIn, validateSignUp } from './auth-form';

describe('auth form validation', () => {
  describe('validateSignIn', () => {
    it('requires both fields', () => {
      expect(validateSignIn({ identifier: ' ', password: '' })).toEqual({
        ok: false,
        errors: {
          identifier: 'auth.validation.identifierRequired',
          password: 'auth.validation.passwordRequired',
        },
      });
    });

    it('does not apply sign-up password rules', () => {
      expect(validateSignIn({ identifier: 'a@b.uz', password: 'x' })).toEqual({
        ok: true,
        value: { identifier: 'a@b.uz', password: 'x' },
      });
    });

    it('rejects an identifier that is neither phone nor email', () => {
      expect(validateSignIn({ identifier: 'hello', password: 'x' })).toMatchObject({
        ok: false,
        errors: { identifier: 'auth.validation.identifierInvalid' },
      });
    });
  });

  describe('validateSignUp', () => {
    it('sends a phone as phone, normalised', () => {
      expect(validateSignUp({ identifier: '90 123 45 67', password: 'secret123' })).toEqual({
        ok: true,
        value: { phone: '+998901234567', password: 'secret123' },
      });
    });

    it('sends an email as email, lower-cased', () => {
      expect(validateSignUp({ identifier: 'Seller@Shop.UZ', password: 'secret123' })).toEqual({
        ok: true,
        value: { email: 'seller@shop.uz', password: 'secret123' },
      });
    });

    it('enforces the password length', () => {
      expect(validateSignUp({ identifier: 'a@b.uz', password: 'short' })).toMatchObject({
        ok: false,
        errors: { password: 'auth.validation.passwordTooShort' },
      });
      expect(validateSignUp({ identifier: 'a@b.uz', password: 'x'.repeat(129) })).toMatchObject({
        ok: false,
        errors: { password: 'auth.validation.passwordTooLong' },
      });
    });
  });
});
