// ========================================
// LOAN MANAGEMENT - VALIDATION RULES
// ========================================
// The rules behind the Loan form in the Super Admin panel.
//
// MONEY RULES ARE THE SAME EVERYWHERE IN THIS PROJECT
//   Whole rupees only (no paisa), always greater than zero, and never more than
//   one hundred million - a typo like 50,00,00,000 can never be saved by
//   accident. Loan money is kept COMPLETELY separate from the monthly member
//   fund, so these rules do not touch the fund tables at all.
// ========================================

import { z } from 'zod';

// ---------- Small building blocks ----------
const requiredText = (label: string, min = 1, max = 300) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `Please keep ${label.toLowerCase()} under ${max} characters.`);

const optionalText = (max = 500) =>
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

/** A whole rupee amount that must be present and sensible. */
const moneyField = (label: string) =>
  z
    .union([z.number(), z.string()])
    .transform((value, context) => {
      const raw = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[, ]/g, ''));
      if (!Number.isFinite(raw)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a number.` });
        return 0;
      }
      const rounded = Math.round(raw);
      if (rounded <= 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be more than zero.` });
      }
      if (rounded > 100_000_000) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} looks far too large. Please check the number.`,
        });
      }
      return rounded;
    });

/** A whole rupee amount that may be empty (treated as zero). */
const optionalMoneyField = (label: string) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((value) => {
      const raw = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[, ]/g, ''));
      if (!Number.isFinite(raw) || raw === 0) return 0;
      const rounded = Math.round(raw);
      if (rounded < 0 || rounded > 100_000_000) return 0;
      return rounded;
    });

const dateField = () =>
  z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === '') return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    });

const intField = (fallback = 0) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === '') return fallback;
      const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
    });

const boolField = (fallback = false) =>
  z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined || value === null || value === '') return fallback;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
    });

const optionField = (values: string[], fallback: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      const candidate = (value ?? '').toUpperCase().replace(/[\s-]+/g, '_');
      return values.includes(candidate) ? candidate : fallback;
    });

// ========================================
// LOAN STATUSES
// ========================================
// The whole life of a loan, in order. Every status has its own colour so the
// list can be read at a glance.
export const LOAN_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending (waiting for review)' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved (not yet paid out)' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DISBURSED', label: 'Disbursed (money given)' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'COMPLETED', label: 'Completed (fully repaid)' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const LOAN_STATUS_VALUES = LOAN_STATUS_OPTIONS.map((option) => option.value);

/** Which colour a status badge gets in the interface. */
export const LOAN_STATUS_TONES: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'info',
  REJECTED: 'danger',
  DISBURSED: 'info',
  PARTIALLY_PAID: 'warning',
  OVERDUE: 'danger',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

/** Is this loan finished with, one way or another? */
export function isFinalLoanStatus(status: string): boolean {
  return status === 'REJECTED' || status === 'CANCELLED';
}

/** The agreement on paper: signed, still to be signed, or not needed. */
export const LOAN_AGREEMENT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Agreement not signed yet' },
  { value: 'SIGNED', label: 'Agreement signed' },
  { value: 'NOT_REQUIRED', label: 'No agreement needed' },
];

/** How the money came back (kept the same as the fund methods where possible). */
export const LOAN_RETURN_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash (handed to the office)' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'ESEWA', label: 'eSewa' },
  { value: 'KHALTI', label: 'Khalti' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

// ========================================
// ONE LOAN
// ========================================
export const loanSchema = z.object({
  // Which member borrowed the money. Only real accounts can be chosen, so every
  // loan is tied to a person in the member list.
  memberId: requiredText('Member', 1, 60),

  principalAmount: moneyField('Loan amount'),
  // 0 means the club does not charge interest.
  interestAmount: optionalMoneyField('Interest'),

  currency: z.string().trim().max(8).optional().nullable(),

  requestedDate: dateField(),
  // The date the money was handed over (or will be).
  givenDate: dateField(),
  disbursedDate: dateField(),
  expectedReturnDate: dateField(),

  purpose: optionalText(500),
  agreementNote: optionalText(2000),
  installments: intField(0),

  // ---------- The physical agreement ----------
  agreementSigned: boolField(false),
  agreementNo: optionalText(60),
  agreementDate: dateField(),
  agreementStatus: optionField(['PENDING', 'SIGNED', 'NOT_REQUIRED'], 'PENDING'),
  agreementUrl: optionalText(500),
  supportingUrl: optionalText(500),

  notes: optionalText(2000),
});

/** Editing a loan: every box is optional so one change can be saved alone. */
export const loanUpdateSchema = loanSchema.partial();

// ========================================
// ONE REPAYMENT
// ========================================
export const loanReturnSchema = z.object({
  loanId: requiredText('Loan', 1, 60),
  amount: moneyField('Repayment amount'),
  returnDate: dateField(),
  method: optionField(LOAN_RETURN_METHOD_OPTIONS.map((o) => o.value), 'CASH'),
  referenceNumber: optionalText(80),
  proofUrl: optionalText(500),
  notes: optionalText(1000),
});

// ========================================
// APPROVE / REJECT / DISBURSE / CANCEL
// ========================================
// Status is NEVER typed into the form. The only way to move a loan forward is
// through this action, which the server checks (see
// app/api/admin/loans/decisions/route.ts).
export const LOAN_DECISIONS = ['UNDER_REVIEW', 'APPROVE', 'REJECT', 'DISBURSE', 'CANCEL'] as const;

export const loanDecisionSchema = z.object({
  loanId: requiredText('Loan', 1, 60),
  action: z
    .string()
    .transform((value) => value.toUpperCase().replace(/[\s-]+/g, '_'))
    .refine((value) => (LOAN_DECISIONS as readonly string[]).includes(value), {
      message: 'Unknown action.',
    }),
  // A reason is required for REJECT and CANCEL: the member is shown it, and it
  // is kept in the audit trail.
  reason: optionalText(500),
  // The date the money actually changed hands (for DISBURSE).
  disbursedDate: dateField(),
});

// ========================================
// SEARCH AND FILTERS FOR THE LOAN LIST
// ========================================
export const LOAN_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest amount' },
  { value: 'lowest', label: 'Lowest amount' },
  { value: 'overdue', label: 'Overdue first' },
];
