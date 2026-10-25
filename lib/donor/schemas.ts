// ========================================
// DONOR ACCOUNT - VALIDATION RULES
// ========================================
// The rules behind  /donor/register  and  /donor/login.
//
// They run in the browser (so a mistake is shown straight away) AND again in the
// server routes (because a browser can be bypassed). The server copy is the one
// that decides.
//
// WHY THE EMAIL IS THE USERNAME
//   It is the one thing a person cannot forget, it is already printed on every
//   donation record, and it makes "I gave last month, where is it?" answerable
//   without inventing a second name to remember.
// ========================================

import { z } from 'zod';

const emailField = z
  .string({ required_error: 'Please enter your email address.' })
  .trim()
  .toLowerCase()
  .max(160, 'Please keep the email address under 160 characters.')
  .email('Please enter a valid email address.');

const nameField = z
  .string({ required_error: 'Please enter your full name.' })
  .trim()
  .min(2, 'Please enter your full name.')
  .max(120, 'Please keep your name under 120 characters.');

/**
 * A mobile number is optional here.
 *
 * A donor account is about seeing your own history, not about being contacted,
 * so nobody is forced to hand over a number to look at their own records. When
 * one IS given it is stored as "+977 9812345678", the same shape the donation
 * form uses.
 */
const phoneField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    const text = (value ?? '').replace(/[^\d+\s-]/g, '').replace(/[\s-]/g, '');
    return text === '' ? null : text.slice(0, 30);
  })
  .refine((value) => value === null || /^\+?\d{6,15}$/.test(value), {
    message: 'Please enter the mobile number using digits only (6 to 15 digits).',
  });

// ========================================
// REGISTER
// ========================================
export const donorRegisterSchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField,

    password: z
      .string({ required_error: 'Please choose a password.' })
      .min(8, 'Use at least 8 characters.')
      .max(72, 'Please keep the password under 72 characters.'),

    // Only checked when it is sent. The browser sends it so that a typing
    // mistake is caught before anything is created.
    confirmPassword: z.string().optional().nullable(),

    // Hidden anti-spam box. Real people never see it.
    website: z.string().optional().nullable(),

    // The tick box beside "I agree to the Terms and Privacy Policy". Optional in
    // type because an old client may not send it, but superRefine makes it
    // mandatory - a donor account cannot be created without consent.
    acceptTerms: z
      .union([z.boolean(), z.string(), z.number()])
      .optional()
      .nullable()
      .transform((value) => value === true || value === 'true' || value === 'on' || value === 1 || value === '1'),
  })
  .superRefine((value, context) => {
    if (!/[A-Za-z]/.test(value.password)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Include at least one letter.',
      });
    }

    if (!/[0-9]/.test(value.password)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Include at least one number.',
      });
    }

    if (value.confirmPassword != null && value.confirmPassword !== value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'The two passwords do not match.',
      });
    }

    // Consent is not a formality we can skip on the server: a request that does
    // not carry it is refused here, whatever the browser did or did not show.
    if (!value.acceptTerms) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['acceptTerms'],
        message: 'Please accept the Terms and Privacy Policy to continue.',
      });
    }
  });

export type DonorRegisterInput = z.infer<typeof donorRegisterSchema>;

// ========================================
// LOGIN
// ========================================
export const donorLoginSchema = z.object({
  email: emailField,
  password: z.string({ required_error: 'Please enter your password.' }).min(1, 'Please enter your password.'),
  remember: z.boolean().optional().nullable(),
});

export type DonorLoginInput = z.infer<typeof donorLoginSchema>;
