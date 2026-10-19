// ========================================
// KARYA SAMITI (कार्य समिति) - VALIDATION RULES
// ========================================
// The rules for the committee form in the Admin Panel.
//
// TWO GROUPS OF FIELDS
//   PUBLIC  -> shown to every visitor: name, post, current address, photo
//   PRIVATE -> Admin / Super Admin only: phone, email, permanent address,
//              date of birth, citizenship, member number, joining dates, notes
//
// Keeping both groups in ONE schema makes the split visible in one place: it is
// obvious from this file which fields the office must treat as confidential.
// ========================================

import { z } from 'zod';

// ---------- Reusable pieces (same style as lib/validation/schemas.ts) ----------
const requiredText = (label: string, min = 1, max = 300) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(min, `${label} must be at least ${min} character(s).`)
    .max(max, `${label} must be shorter than ${max} characters.`);

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
      const candidate = (value ?? '').toUpperCase();
      return values.includes(candidate) ? candidate : fallback;
    });

// ========================================
// COMMITTEE MEMBERS
// ========================================
export const KARYA_STATUS_OPTIONS = [
  { value: 'CURRENT', label: 'Current (serving now)' },
  { value: 'FORMER', label: 'Former (past committee)' },
];

export const KARYA_STATUS_VALUES = ['CURRENT', 'FORMER'];

export const karyaMemberSchema = z.object({
  // ---------- PUBLIC INFORMATION ----------
  fullName: requiredText('Full name', 2, 160),
  // The position as it should be printed. Kept as free text so a custom post
  // can be typed even before it exists in the posts list.
  postTitle: requiredText('Post / position', 1, 120),
  postId: optionalText(60),
  currentAddress: optionalText(300),
  photoUrl: optionalText(500),
  displayOrder: intField(0),
  status: optionField(KARYA_STATUS_VALUES, 'CURRENT'),
  isActive: boolField(true),

  // ---------- PRIVATE INFORMATION (Admin / Super Admin only) ----------
  phone: optionalText(30),
  email: optionalText(160),
  permanentAddress: optionalText(300),
  dateOfBirth: dateField(),
  citizenshipNo: optionalText(60),
  citizenshipDistrict: optionalText(80),
  memberCode: optionalText(60),
  userId: optionalText(60),
  joiningDate: dateField(),
  committeeJoiningDate: dateField(),
  internalNotes: optionalText(4000),
});

/** Editing: every box is optional, so a single change can be saved alone. */
export const karyaMemberUpdateSchema = karyaMemberSchema.partial();

/** Marking somebody as a past committee member (or bringing them back). */
export const karyaStatusSchema = z.object({
  status: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => KARYA_STATUS_VALUES.includes(value), {
      message: 'Unknown status value.',
    }),
});

// ========================================
// COMMITTEE POSTS / POSITIONS
// ========================================
export const karyaPostSchema = z.object({
  // The Nepali name, e.g. "अध्यक्ष". Free text, so any position can be created.
  name: requiredText('Position name', 1, 80),
  nameEn: optionalText(80),
  description: optionalText(500),
  sortOrder: intField(0),
  isActive: boolField(true),
});

// ========================================
// THE POSITIONS A NEW INSTALLATION STARTS WITH
// ========================================
// These are only a starting point. The organization can rename them, change
// their order or add entirely new ones - see the "Committee posts" screen.
export const DEFAULT_KARYA_POSTS = [
  { name: 'अध्यक्ष', nameEn: 'Chairperson', sortOrder: 1 },
  { name: 'उपाध्यक्ष', nameEn: 'Vice Chairperson', sortOrder: 2 },
  { name: 'सचिव', nameEn: 'Secretary', sortOrder: 3 },
  { name: 'सह–सचिव', nameEn: 'Joint Secretary', sortOrder: 4 },
  { name: 'कोषाध्यक्ष', nameEn: 'Treasurer', sortOrder: 5 },
  { name: 'सदस्य', nameEn: 'Member', sortOrder: 6 },
];

// ========================================
// COMMITTEE DUTIES (role & responsibilities)
// ========================================
// One duty belongs to one committee member. The administrator writes the words,
// so nothing here is tied to a particular post - the Treasurer this year may
// have completely different duties next year.
export const committeeDutySchema = z.object({
  memberId: requiredText('Committee member', 1, 60),
  title: requiredText('Responsibility', 3, 200),
  description: optionalText(4000),
  instructions: optionalText(4000),
  deadline: dateField(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
});

export type CommitteeDutyInput = z.infer<typeof committeeDutySchema>;

/** The three states a duty can be in, used by the list and the member panel. */
export const DUTY_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;
