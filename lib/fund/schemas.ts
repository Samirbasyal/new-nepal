// ========================================
// FUND MANAGEMENT - FORM VALIDATION (ZOD SCHEMAS)
// ========================================
// Every fund form - in the Admin Panel and in the Member Panel - is validated
// with the rules below, ON THE SERVER.
//
// WHY THIS FILE IS SEPARATE FROM lib/validation/schemas.ts
//   The website schemas deal with text and pictures. Money needs extra care
//   (whole numbers only, never negative, never zero, an upper sanity limit),
//   so the fund rules live together in one clearly marked place.
//
// IMPORTANT
//   These rules run again inside the API routes. Editing the page in the
//   browser therefore cannot put a wrong amount into the database.
// ========================================

import { z } from 'zod';
import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  EXPENSE_METHOD_OPTIONS,
  EXPENSE_STATUS_OPTIONS,
  CONTRIBUTION_STATUS_OPTIONS,
} from '@/lib/constants';

// The values allowed by each dropdown, taken from lib/constants.ts so the
// form and the validation can never drift apart.
const paymentMethods = PAYMENT_METHOD_OPTIONS.map((option) => option.value);
const expenseMethods = EXPENSE_METHOD_OPTIONS.map((option) => option.value);
const contributionStatuses = CONTRIBUTION_STATUS_OPTIONS.map((option) => option.value);

// A single record can never be larger than this. It exists to catch typing
// mistakes such as 100000000 instead of 1000.
const MAX_AMOUNT = 100_000_000;

// ========================================
// SMALL MONEY / DATE FIELD BUILDERS
// ========================================

/**
 * An amount of money.
 * Accepts a number or the text typed into an input box, and always produces a
 * WHOLE positive number. Decimals, negatives, zero and text are rejected.
 */
const moneyField = (label: string) =>
  z
    .union([z.number(), z.string()], {
      errorMap: () => ({ message: `${label} must be a number.` }),
    })
    .transform((value) => (typeof value === 'number' ? value : Number(String(value).trim())))
    .refine((value) => Number.isFinite(value), {
      message: `${label} must be a number.`,
    })
    .refine((value) => Number.isInteger(value), {
      message: `${label} must be a whole number (no paisa / cents).`,
    })
    .refine((value) => value > 0, {
      message: `${label} must be greater than zero.`,
    })
    .refine((value) => value <= MAX_AMOUNT, {
      message: `${label} looks too large. Please check the amount.`,
    });


/**
 * An amount of money that may be left empty.
 * An empty box becomes null, which means "leave this value as it is".
 */
const optionalMoneyField = () =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      const number = typeof value === 'number' ? value : Number(value.trim());
      return Number.isFinite(number) ? Math.trunc(number) : null;
    });

/** A required date. Accepts "2026-10-18" or a full date-time value. */
const dateField = (label: string) =>
  z
    .union([z.string(), z.date()], {
      errorMap: () => ({ message: `${label} is required.` }),
    })
    .transform((value) => (value instanceof Date ? value : new Date(String(value).trim())))
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: `${label} must be a valid date.`,
    });

/** An optional date. An empty box becomes null. */
const optionalDateField = () =>
  z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      const date = value instanceof Date ? value : new Date(String(value).trim());
      return Number.isNaN(date.getTime()) ? null : date;
    });

/**
 * A month value such as "2026-10" or "2026-10-01".
 * It is always stored as the FIRST day of that month, which is what makes a
 * month appear only once in the monthly tracking table.
 */
const monthField = (label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .transform((value, ctx) => {
      // "2026-10" -> "2026-10-01"
      const parts = value.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);

      if (!year || !month || month < 1 || month > 12) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is not a valid month.` });
        return z.NEVER;
      }

      return new Date(year, month - 1, 1, 0, 0, 0, 0);
    });

/** Optional text: an empty box is stored as null. */
const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .nullable()
    .transform((value) => {
      const text = (value ?? '').trim();
      return text === '' ? null : text;
    });

/** Required text. */
const requiredText = (label: string, min = 1, max = 500) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} must be shorter than ${max} characters.`);

/** An optional database id ("" or null both become null). */
const optionalId = () =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      const text = String(value ?? '').trim();
      return text === '' ? null : text;
    });

/** A required database id. */
const requiredId = (label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`);

/** One of a fixed list of values (used by the dropdowns). */
const choice = (values: string[], label: string) =>
  z.string().trim().refine((value) => values.includes(value), {
    message: `Please choose a valid ${label}.`,
  });

// ========================================
// PAYMENT SETTINGS
// (Admin Panel -> Fund management -> Payment settings)
// ========================================
// ONE ROW = ONE way a member can pay.
//
// It covers more than banks now, because the office also accepts eSewa and
// Khalti. "methodType" says which kind of account the row is:
//     BANK   -> bank name, account number, branch, account holder
//     ESEWA  -> "eSewa" as the name, the eSewa ID as the number
//     KHALTI -> "Khalti" as the name, the Khalti ID as the number
//     OTHER  -> anything else (a cooperative, a remittance agent...)
//
// A QR picture can be attached to ANY of them, which is how most members
// actually pay.
export const bankSchema = z.object({
  name: requiredText('Name (bank or wallet)', 2, 120),
  accountName: requiredText('Account holder name', 2, 160),
  accountNumber: requiredText('Account or wallet number', 3, 60),
  branch: optionalText(120),
  qrImageUrl: optionalText(600),
  instructions: optionalText(1500),
  methodType: choice(['BANK', 'ESEWA', 'KHALTI', 'OTHER'], 'payment method').default('BANK'),
  // The label printed above the number, e.g. "Account number", "eSewa ID".
  accountLabel: optionalText(60),
  // The account members are asked to use first.
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

// ========================================
// FUND CATEGORIES  (Monthly fund, donation, event fund...)
// ========================================
export const fundCategorySchema = z.object({
  name: requiredText('Category name', 2, 120),
  slug: optionalText(120),
  description: optionalText(600),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

// ========================================
// EXPENSE CATEGORIES
// ========================================
export const expenseCategorySchema = z.object({
  name: requiredText('Category name', 2, 120),
  slug: optionalText(120),
  description: optionalText(600),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

// ========================================
// A MEMBER SUBMITS A PAYMENT
// (Member Panel -> Monthly Fund -> Pay)
// ========================================
// NOTE: "memberId" is deliberately NOT part of this schema. The server takes
// the member from the signed-in session, so a member can never submit a
// payment in somebody else's name.
export const memberPaymentSubmitSchema = z.object({
  amount: moneyField('Amount'),
  bankId: requiredId('Bank'),
  paymentDate: dateField('Payment date'),
  transactionId: requiredText('Transaction ID', 3, 120),
  referenceNumber: optionalText(120),
  receiptUrl: optionalText(600),
  fundCategoryId: optionalId(),
  periodMonth: optionalDateField(),
  note: optionalText(1000),
});

// ========================================
// AN ADMINISTRATOR RECORDS A PAYMENT BY HAND
// (for cash handed in at the office, or a donation that arrived by post)
// ========================================
export const adminPaymentSchema = z.object({
  memberId: requiredId('Member'),
  amount: moneyField('Amount'),
  bankId: optionalId(),
  bankNameSnapshot: optionalText(160),
  paymentDate: dateField('Payment date'),
  method: choice(paymentMethods, 'payment method').default('BANK_TRANSFER'),
  transactionId: requiredText('Transaction ID', 2, 120),
  referenceNumber: optionalText(120),
  receiptUrl: optionalText(600),
  fundCategoryId: optionalId(),
  purpose: optionalText(300),
  description: optionalText(1000),
  periodMonth: optionalDateField(),
  status: choice(
    PAYMENT_STATUS_OPTIONS.map((option) => option.value),
    'status',
  ).default('PENDING'),
  reviewNote: optionalText(600),
});

// ========================================
// ADMIN DECIDES ON A PAYMENT (approve / reject)
// ========================================
export const paymentDecisionSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED'], {
      errorMap: () => ({ message: 'Please choose Approve or Reject.' }),
    }),
    reviewNote: optionalText(600),
  })
  .refine((value) => value.decision !== 'REJECTED' || (value.reviewNote ?? '').length >= 3, {
    message: 'Please explain why the payment is being rejected.',
    path: ['reviewNote'],
  });

/** Cancelling a payment (for example the member reported a wrong entry). */
export const paymentCancelSchema = z.object({
  reason: optionalText(600),
});

// ========================================
// EXPENSES
// ========================================
export const expenseSchema = z.object({
  title: requiredText('Expense title', 2, 200),
  categoryId: optionalId(),
  amount: moneyField('Amount'),
  expenseDate: dateField('Expense date'),
  paidTo: optionalText(200),
  method: choice(expenseMethods, 'payment method').default('CASH'),
  description: optionalText(1500),
  receiptUrl: optionalText(600),
  referenceNumber: optionalText(120),
  status: choice(
    EXPENSE_STATUS_OPTIONS.map((option) => option.value),
    'status',
  ).optional(),
});

export const expenseDecisionSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED'], {
      errorMap: () => ({ message: 'Please choose Approve or Reject.' }),
    }),
    reviewNote: optionalText(600),
  })
  .refine((value) => value.decision !== 'REJECTED' || (value.reviewNote ?? '').length >= 3, {
    message: 'Please explain why the expense is being rejected.',
    path: ['reviewNote'],
  });

// ========================================
// MONTHLY CONTRIBUTIONS
// ========================================
/** Change the amount a member owes for one month, or waive the month. */
export const contributionUpdateSchema = z.object({
  requiredAmount: optionalMoneyField(),
  status: choice(contributionStatuses, 'status').optional(),
  waivedReason: optionalText(400),
  note: optionalText(600),
});

/** Create the month for every active member in one go. */
export const contributionGenerateSchema = z.object({
  periodMonth: monthField('Month'),
  requiredAmount: moneyField('Monthly amount').optional(),
  // When true, members who already have a row for that month are updated.
  includeExisting: z.boolean().default(false),
});

// ========================================
// REPORTS / EXPORT
// ========================================
export const reportQuerySchema = z.object({
  report: z
    .enum([
      'collections',
      'expenses',
      'member-payments',
      'pending-payments',
      'bank-wise',
      'category-wise',
      'balance',
      'transactions',
      'member-contributions',
    ])
    .default('collections'),
  preset: z.enum(['today', 'week', 'month', 'year', 'custom', 'all']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  bankId: z.string().optional(),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});
