import { z } from 'zod';

import { phoneSchema } from './auth';
import { isoDateSchema } from './calendar';
import { debtStatusSchema } from './debt-status';
import { currencySchema } from './money';

/**
 * Request and response shapes for customers, debts and payments. The api
 * validates requests with these and the app parses responses with them, so
 * both sides agree by construction.
 */

/** A positive whole number of minor units that stays exact as a JS number. */
export const positiveMinorSchema = z
  .number()
  .int('amount must be a whole number of minor units')
  .positive('amount must be greater than zero')
  .max(Number.MAX_SAFE_INTEGER, 'amount is too large');

const nameSchema = z.string().trim().min(1, 'name is required').max(100, 'name is too long');
const noteSchema = z.string().trim().max(500, 'note is too long');

/** An empty string from a cleared form field means "no value". */
const cleared = z.literal('').transform((): null => null);

const optionalNote = z.union([cleared, noteSchema]).nullable().optional();

// --- customers -------------------------------------------------------------

export const createCustomerRequestSchema = z.object({
  name: nameSchema,
  phone: z.union([cleared, phoneSchema]).nullable().optional(),
  note: optionalNote,
});

export type CreateCustomerRequest = z.input<typeof createCustomerRequestSchema>;

export const updateCustomerRequestSchema = createCustomerRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'nothing to update');

export type UpdateCustomerRequest = z.input<typeof updateCustomerRequestSchema>;

export const customerListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
});

export const balanceSchema = z.object({
  currency: currencySchema,
  remainingMinor: z.number().int(),
});

export type Balance = z.infer<typeof balanceSchema>;

export const customerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  note: z.string().nullable(),
  /** What the customer still owes, one entry per currency with a non-zero remainder. */
  balances: z.array(balanceSchema),
  openDebtCount: z.number().int().nonnegative(),
  /** The most urgent status among open debts; null when nothing is owed. */
  status: debtStatusSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export type Customer = z.infer<typeof customerSchema>;

// --- debts -----------------------------------------------------------------

export const createDebtRequestSchema = z
  .object({
    customerId: z.uuid(),
    amountMinor: positiveMinorSchema,
    currency: currencySchema.default('USD'),
    description: optionalNote,
    /** Defaults to today in the owner's timezone. */
    issuedOn: isoDateSchema.optional(),
    dueOn: isoDateSchema,
  })
  .refine((value) => value.issuedOn === undefined || value.dueOn >= value.issuedOn, {
    message: 'due date cannot be before the issue date',
    path: ['dueOn'],
  });

export type CreateDebtRequest = z.input<typeof createDebtRequestSchema>;

export const updateDebtRequestSchema = z
  .object({
    amountMinor: positiveMinorSchema,
    currency: currencySchema,
    description: optionalNote,
    issuedOn: isoDateSchema,
    dueOn: isoDateSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'nothing to update');

export type UpdateDebtRequest = z.input<typeof updateDebtRequestSchema>;

export const debtListQuerySchema = z.object({
  status: debtStatusSchema.optional(),
  customerId: z.uuid().optional(),
});

export type DebtListQuery = z.infer<typeof debtListQuerySchema>;

export const debtSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  customerName: z.string(),
  amountMinor: z.number().int().positive(),
  currency: currencySchema,
  description: z.string().nullable(),
  issuedOn: isoDateSchema,
  dueOn: isoDateSchema,
  paidMinor: z.number().int(),
  remainingMinor: z.number().int(),
  status: debtStatusSchema,
  createdAt: z.iso.datetime(),
});

export type Debt = z.infer<typeof debtSchema>;

// --- payments --------------------------------------------------------------

export const PAYMENT_KINDS = ['PAYMENT', 'CORRECTION'] as const;

export const paymentKindSchema = z.enum(PAYMENT_KINDS);

export type PaymentKind = z.infer<typeof paymentKindSchema>;

/**
 * The amount is always sent as a positive number; the kind decides the sign.
 * A CORRECTION undoes that much of what was paid before.
 */
export const createPaymentRequestSchema = z.object({
  kind: paymentKindSchema.default('PAYMENT'),
  amountMinor: positiveMinorSchema,
  /** Defaults to today in the owner's timezone. */
  paidOn: isoDateSchema.optional(),
  note: optionalNote,
});

export type CreatePaymentRequest = z.input<typeof createPaymentRequestSchema>;

export const paymentSchema = z.object({
  id: z.uuid(),
  kind: paymentKindSchema,
  /** Signed: positive for PAYMENT, negative for CORRECTION. */
  amountMinor: z.number().int(),
  paidOn: isoDateSchema,
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type Payment = z.infer<typeof paymentSchema>;

export const debtDetailSchema = debtSchema.extend({
  payments: z.array(paymentSchema),
});

export type DebtDetail = z.infer<typeof debtDetailSchema>;

// --- summary ---------------------------------------------------------------

export const statusTotalSchema = z.object({
  count: z.number().int().nonnegative(),
  remainingMinor: z.number().int().nonnegative(),
});

export type StatusTotal = z.infer<typeof statusTotalSchema>;

export const currencySummarySchema = z.object({
  currency: currencySchema,
  overdue: statusTotalSchema,
  dueToday: statusTotalSchema,
  upcoming: statusTotalSchema,
});

export const ledgerSummarySchema = z.object({
  /** The owner's "today", so the app labels match the server's statuses. */
  today: isoDateSchema,
  currencies: z.array(currencySummarySchema),
});

export type LedgerSummary = z.infer<typeof ledgerSummarySchema>;

// --- data export -----------------------------------------------------------

/** Raw rows, not computed views: the export is the user's own copy of the data. */
export const accountExportSchema = z.object({
  exportedAt: z.iso.datetime(),
  user: z.object({
    id: z.uuid(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    timezone: z.string(),
    createdAt: z.iso.datetime(),
  }),
  customers: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      phone: z.string().nullable(),
      note: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
  debts: z.array(
    z.object({
      id: z.uuid(),
      customerId: z.uuid(),
      amountMinor: z.number().int(),
      currency: currencySchema,
      description: z.string().nullable(),
      issuedOn: isoDateSchema,
      dueOn: isoDateSchema,
      createdAt: z.iso.datetime(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.uuid(),
      debtId: z.uuid(),
      kind: paymentKindSchema,
      amountMinor: z.number().int(),
      paidOn: isoDateSchema,
      note: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
});

export type AccountExport = z.infer<typeof accountExportSchema>;
