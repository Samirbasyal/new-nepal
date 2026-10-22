// ========================================
// MEMBERSHIP REQUESTS - FORM VALIDATION
// ========================================
// ONE set of rules, used by BOTH sides:
//   - the browser form (components/member/MembershipRequestForm.tsx) so the
//     applicant is told about a mistake before waiting for the server
//   - the API route (app/api/membership-requests/route.ts) so a request sent
//     with curl, or a browser with JavaScript switched off, is checked just as
//     strictly
//
// Validating in the browser alone would be useless: anybody can skip it. The
// server check is the one that actually protects the database.
// ========================================

import { z } from 'zod';

// ========================================
// SMALL SHARED PIECES
// ========================================
const name = z
  .string({ required_error: 'Please enter your full name.' })
  .trim()
  .min(2, 'Please enter your full name.')
  .max(120, 'This name is too long (120 characters at most).');

const email = z
  .string({ required_error: 'Please enter your email address.' })
  .trim()
  .toLowerCase()
  .min(5, 'Please enter your email address.')
  .max(190, 'This email address is too long.')
  .email('Please enter a valid email address, for example name@example.com.');

// A mobile number is stored as the person typed it (only the spacing and
// brackets are cleaned up). We deliberately do not force a +977 prefix: the club
// also receives numbers from people working abroad.
const mobileNumber = z
  .string({ required_error: 'Please enter your mobile number.' })
  .trim()
  .min(7, 'Please enter a valid mobile number.')
  .max(25, 'This mobile number is too long.')
  .regex(/^[0-9+\-\s()]+$/, 'A mobile number can only contain digits, spaces, +, - and brackets.')
  .refine((value) => value.replace(/\D/g, '').length >= 7, {
    message: 'Please enter a valid mobile number (at least 7 digits).',
  });

// Empty string is treated as "not filled in" rather than as an error, because
// that is exactly what an untouched optional input sends.
const optionalDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : ''))
  .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Please choose a valid date.',
  })
  .refine(
    (value) => {
      if (value === '') return true;
      const parsed = new Date(`${value}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return false;
      // A date of birth in the future is always a typing mistake.
      return parsed.getTime() < Date.now();
    },
    { message: 'The date of birth cannot be in the future.' },
  );

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : ''));

// ========================================
// 1. THE PUBLIC APPLICATION FORM
// ========================================
export const membershipRequestSchema = z.object({
  fullName: name,
  email,
  mobileNumber,
  currentAddress: z
    .string({ required_error: 'Please enter your current address.' })
    .trim()
    .min(3, 'Please enter your current address.')
    .max(300, 'This address is too long (300 characters at most).'),
  dateOfBirth: optionalDate,
  occupation: optionalText(120, 'This is too long (120 characters at most).'),
  reasonForJoining: z
    .string({ required_error: 'Please tell us why you want to join.' })
    .trim()
    .min(10, 'Please write at least a sentence about why you want to join.')
    .max(600, 'Please keep this under 600 characters.'),
  requestLetter: z
    .string({ required_error: 'Please write your request letter.' })
    .trim()
    .min(30, 'Please write a little more in your request letter (at least 30 characters).')
    .max(5000, 'Please keep the request letter under 5000 characters.'),
  // The checkbox arrives as "true"/"on"/true depending on how the form was sent.
  // Everything that is not a clear yes is refused.
  agree: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === 'true' || value === 'on' || value === '1')
    .refine((value) => value === true, {
      message: 'Please confirm that you agree to the membership rules.',
    }),
});

export type MembershipRequestInput = z.infer<typeof membershipRequestSchema>;

// ========================================
// 2. THE ADMIN EDIT FORM
// ========================================
// Same fields, but every one is optional: an administrator correcting a typo
// must not be forced to retype the whole application.
export const membershipRequestUpdateSchema = z.object({
  fullName: name.optional(),
  email: email.optional(),
  mobileNumber: mobileNumber.optional(),
  currentAddress: z.string().trim().min(3).max(300).optional(),
  dateOfBirth: optionalDate.optional(),
  occupation: optionalText(120, 'This is too long (120 characters at most).').optional(),
  reasonForJoining: z.string().trim().min(10).max(600).optional(),
  requestLetter: z.string().trim().min(30).max(5000).optional(),
  adminNote: optionalText(2000, 'Please keep the note under 2000 characters.').optional(),
});

export type MembershipRequestUpdateInput = z.infer<typeof membershipRequestUpdateSchema>;

// ========================================
// 3. APPROVE / REJECT
// ========================================
export const membershipDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], {
    errorMap: () => ({ message: 'Choose either approve or reject.' }),
  }),
  rejectionReason: z
    .string()
    .trim()
    .max(1000, 'Please keep the reason under 1000 characters.')
    .optional(),
});

// ========================================
// 4. ACTIVATION (the applicant chooses a password)
// ========================================
export const activationSchema = z
  .object({
    token: z.string().trim().min(20, 'This activation link is not complete.'),
    password: z
      .string({ required_error: 'Please choose a password.' })
      .min(8, 'Use at least 8 characters.')
      .max(200, 'This password is too long.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirmPassword: z.string().min(1, 'Please type the password again.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match.',
  });

export type ActivationInput = z.infer<typeof activationSchema>;
