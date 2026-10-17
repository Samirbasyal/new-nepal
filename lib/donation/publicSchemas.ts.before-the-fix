// ========================================
// PUBLIC DONATION FORM - VALIDATION RULES
// ========================================
// These rules run on the SERVER, in the two public routes:
//   POST /api/donations/draft    -> step 2 and 3 (purpose + donor details)
//   POST /api/donations/submit   -> step 4 and 5 (amount + method + receipt)
//
// The browser runs the same checks first so the donor sees a mistake straight
// away, but the browser can be bypassed - and this file is what actually decides.
//
// WHAT IS DELIBERATELY NOT ACCEPTED FROM THE BROWSER
//   - status: a donor can never send a status. It is chosen by the server.
//   - amount on the draft: the amount is only taken at the payment step.
//   - an arbitrary receipt URL: the address must be one our own upload route
//     produced, otherwise somebody could point "receipt" at a stranger's file.
// ========================================

import { z } from 'zod';
import { DONATION_PURPOSE_CODES } from '@/lib/donation/purposes';

// ========================================
// PHONE: country code + number
// ========================================
// A mobile number is stored as one string, "+977 9812345678", so the office can
// dial it straight from the record. The country is picked from a list rather
// than typed, which is what stops "977-98..." and "00977 98..." becoming two
// different people in the database.
// ========================================
export const COUNTRY_CODES = [
  { code: '977', country: 'Nepal' },
  { code: '91', country: 'India' },
  { code: '1', country: 'USA / Canada' },
  { code: '44', country: 'United Kingdom' },
  { code: '61', country: 'Australia' },
  { code: '971', country: 'UAE' },
  { code: '974', country: 'Qatar' },
  { code: '966', country: 'Saudi Arabia' },
  { code: '82', country: 'South Korea' },
  { code: '81', country: 'Japan' },
  { code: '60', country: 'Malaysia' },
  { code: '65', country: 'Singapore' },
] as const;

const countryCodeField = z
  .string()
  .trim()
  .regex(/^\d{1,4}$/, 'Please choose your country code.')
  .default('977');

const phoneField = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine((value) => /^\d{6,15}$/.test(value), {
    message: 'Please enter the mobile number using digits only (6 to 15 digits).',
  });

const optionalText = (max: number) =>
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

// ========================================
// STEP 2 + 3 - purpose and donor details
// ========================================
export const donationDraftSchema = z
  .object({
    purpose: z.string({ required_error: 'Please choose what your donation is for.' }).trim().min(1),
    // Only used by "Other / General Donation", where the donor explains.
    purposeDetail: optionalText(300),

    donorName: z
      .string({ required_error: 'Please enter your full name.' })
      .trim()
      .min(2, 'Please enter your full name.')
      .max(160, 'Please keep your name under 160 characters.'),

    donorEmail: z
      .string({ required_error: 'Please enter your email address.' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address.'),

    countryCode: countryCodeField,
    phone: phoneField,

    // Why the donor chose this purpose. Optional: a gift needs no justification.
    message: optionalText(1000),

    // Hidden anti-spam box. Real people never see it, so anything in it is a bot.
    website: z.string().optional().nullable(),
  })
  .superRefine((value, context) => {
    // The purpose must be one of the eight. Checked here rather than with
    // z.enum so that lib/donation/purposes.ts stays the only list.
    if (!(DONATION_PURPOSE_CODES as readonly string[]).includes(value.purpose)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['purpose'],
        message: 'Please choose one of the listed purposes.',
      });
    }
  });

export type DonationDraftInput = z.infer<typeof donationDraftSchema>;

/** "+977 9812345678" - the shape saved in the database. */
export function fullPhoneNumber(countryCode: string, phone: string): string {
  return `+${countryCode.trim()} ${phone.trim()}`.slice(0, 30);
}

// ========================================
// STEP 4 + 5 - amount, method, receipt
// ========================================
// Only the methods the club can actually check. Card payments are not in this
// list because no card gateway is connected - offering one would be pretending.
// ========================================
export const PUBLIC_PAYMENT_METHODS = [
  {
    value: 'BANK_TRANSFER',
    label: 'Bank transfer / Bank QR',
    hint: 'Transfer or scan the club QR, then attach the receipt.',
    needsReceipt: true,
  },
  {
    value: 'ESEWA',
    label: 'eSewa',
    hint: 'Send from your eSewa app, then attach the confirmation screenshot.',
    needsReceipt: true,
  },
] as const;

export type PublicPaymentMethod = (typeof PUBLIC_PAYMENT_METHODS)[number]['value'];

export const PUBLIC_PAYMENT_METHOD_VALUES = PUBLIC_PAYMENT_METHODS.map((method) => method.value);

/** A whole-rupee amount that must be present and sensible. */
const amountField = z
  .union([z.number(), z.string()])
  .transform((value, context) => {
    const raw = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[, ]/g, ''));
    if (!Number.isFinite(raw)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Please enter the amount as a number.' });
      return 0;
    }
    const rounded = Math.round(raw);
    if (rounded <= 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Please enter an amount greater than zero.' });
    }
    if (rounded > 100_000_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'That amount looks too large. Please check the number.',
      });
    }
    return rounded;
  });

export const donationSubmitSchema = z
  .object({
    // The reference is the donation id we handed out at step 3.
    reference: z.string().trim().min(10, 'The donation reference is missing.').max(40),

    amount: amountField,
    method: z.string().trim(),

    // Bank / wallet transaction id. Optional: not every method gives one.
    transactionRef: optionalText(80),

    website: z.string().optional().nullable(),
  })
  .superRefine((value, context) => {
    if (!PUBLIC_PAYMENT_METHODS.some((option) => option.value === value.method)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['method'],
        message: 'Please choose how you paid.',
      });
    }
  });

/**
 * Does this method need a receipt picture?
 *
 * WHY THE RECEIPT IS *NOT* PART OF THE SCHEMA ABOVE
 *   The picture arrives as a real uploaded file on the same request, not as a
 *   URL the browser could type. The submit route stores it itself and writes the
 *   address it produced, so a donor can never point "receipt" at somebody else's
 *   file. The view above therefore has nothing to validate about it.
 */
export function methodRequiresReceipt(method: string): boolean {
  return PUBLIC_PAYMENT_METHODS.find((option) => option.value === method)?.needsReceipt ?? true;
}

export type DonationSubmitInput = z.infer<typeof donationSubmitSchema>;
