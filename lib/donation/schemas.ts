// ========================================
// DONATION MANAGEMENT - VALIDATION RULES
// ========================================
// The rules behind  Admin Panel -> Donations.
//
// A DONATION IS NOT A MEMBER CONTRIBUTION
//   Donations live in their own table (prisma/schema.prisma -> model Donation)
//   and have their own status, their own totals and their own report. They are
//   never mixed into the monthly member fund, and the fund is never mixed into
//   the donation figures.
//
// ONLY A VERIFIED DONATION COUNTS AS MONEY RECEIVED
//   That is the same rule as the member payments: somebody has to check that the
//   money really arrived before it is called income.
// ========================================

import { z } from 'zod';

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

const dateField = () =>
  z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === '') return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
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
// THE LISTS THE DROP-DOWNS USE
// ========================================
export const DONATION_TYPE_OPTIONS = [
  { value: 'ONE_TIME', label: 'One-off donation' },
  { value: 'MONTHLY', label: 'Monthly donation' },
  { value: 'GENERAL', label: 'General donation' },
  { value: 'IN_KIND', label: 'In kind (goods, not money)' },
  { value: 'OTHER', label: 'Other' },
];

export const DONATION_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending (waiting to be checked)' },
  { value: 'VERIFIED', label: 'Verified (money received)' },
  { value: 'REJECTED', label: 'Rejected' },
];

export const DONATION_STATUS_VALUES = DONATION_STATUS_OPTIONS.map((option) => option.value);

/** How a donation arrived. The fund methods are reused so the two agree. */
export const DONATION_METHOD_OPTIONS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'ESEWA', label: 'eSewa' },
  { value: 'KHALTI', label: 'Khalti' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'IN_KIND', label: 'Goods / in kind' },
  { value: 'OTHER', label: 'Other' },
];

// ========================================
// ONE DONATION
// ========================================
export const donationSchema = z.object({
  donorName: requiredText('Donor name', 2, 160),
  donorEmail: optionalText(160),
  donorPhone: optionalText(30),
  amount: moneyField('Amount'),
  currency: optionalText(8),
  method: optionField(DONATION_METHOD_OPTIONS.map((o) => o.value), 'BANK_TRANSFER'),
  donationType: optionField(DONATION_TYPE_OPTIONS.map((o) => o.value), 'ONE_TIME'),
  purpose: optionalText(300),
  reference: optionalText(80),
  receivedOn: dateField(),
  note: optionalText(1000),
  remarks: optionalText(1000),
  // The status of a NEW donation is decided by the office; the quickest path is
  // to record it as verified when the money is already in hand.
  status: optionField(DONATION_STATUS_VALUES, 'PENDING'),
});

export const donationUpdateSchema = donationSchema.partial();

// ========================================
// VERIFY / REJECT
// ========================================
export const donationDecisionSchema = z.object({
  id: requiredText('Donation', 1, 60),
  action: z
    .string()
    .transform((value) => value.toUpperCase().replace(/[\s-]+/g, '_'))
    .refine((value) => ['VERIFY', 'REJECT', 'PENDING'].includes(value), {
      message: 'Unknown action.',
    }),
  remarks: optionalText(1000),
});

export const DONATION_STATUS_TONES: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
};
