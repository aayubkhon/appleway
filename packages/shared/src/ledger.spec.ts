import {
  createCustomerRequestSchema,
  createDebtRequestSchema,
  createPaymentRequestSchema,
  updateCustomerRequestSchema,
  updateDebtRequestSchema,
} from './ledger';

const CUSTOMER_ID = '3f8b1c2e-6a9d-4e7f-8b1a-2c3d4e5f6a7b';

describe('ledger schemas', () => {
  describe('customers', () => {
    it('trims the name and normalises the phone', () => {
      expect(
        createCustomerRequestSchema.parse({ name: '  Aziz aka ', phone: '90 123 45 67' }),
      ).toEqual({ name: 'Aziz aka', phone: '+998901234567' });
    });

    it('treats cleared optional fields as null', () => {
      expect(createCustomerRequestSchema.parse({ name: 'Aziz', phone: '', note: '' })).toEqual({
        name: 'Aziz',
        phone: null,
        note: null,
      });
    });

    it('rejects a blank name and a bad phone', () => {
      expect(createCustomerRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
      expect(createCustomerRequestSchema.safeParse({ name: 'A', phone: 'abc' }).success).toBe(
        false,
      );
    });

    it('requires at least one field to update', () => {
      expect(updateCustomerRequestSchema.safeParse({}).success).toBe(false);
      expect(updateCustomerRequestSchema.safeParse({ note: 'VIP' }).success).toBe(true);
    });
  });

  describe('debts', () => {
    const valid = { customerId: CUSTOMER_ID, amountMinor: 150_00, dueOn: '2026-11-01' };

    it('defaults the currency to USD', () => {
      expect(createDebtRequestSchema.parse(valid).currency).toBe('USD');
    });

    it('rejects zero, negative and fractional amounts', () => {
      for (const amountMinor of [0, -5, 1.5]) {
        expect(createDebtRequestSchema.safeParse({ ...valid, amountMinor }).success).toBe(false);
      }
    });

    it('rejects a due date before the issue date', () => {
      expect(createDebtRequestSchema.safeParse({ ...valid, issuedOn: '2026-11-02' }).success).toBe(
        false,
      );
      expect(createDebtRequestSchema.safeParse({ ...valid, issuedOn: '2026-11-01' }).success).toBe(
        true,
      );
    });

    it('requires at least one field to update', () => {
      expect(updateDebtRequestSchema.safeParse({}).success).toBe(false);
      expect(updateDebtRequestSchema.safeParse({ dueOn: '2026-12-01' }).success).toBe(true);
    });
  });

  describe('payments', () => {
    it('defaults to a PAYMENT and takes a positive amount', () => {
      expect(createPaymentRequestSchema.parse({ amountMinor: 10_00 })).toEqual({
        kind: 'PAYMENT',
        amountMinor: 10_00,
      });
    });

    it('rejects a negative amount even for a correction', () => {
      expect(
        createPaymentRequestSchema.safeParse({ kind: 'CORRECTION', amountMinor: -10_00 }).success,
      ).toBe(false);
    });
  });
});
