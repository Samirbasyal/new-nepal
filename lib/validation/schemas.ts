// ========================================
// FORM VALIDATION (ZOD SCHEMAS)
// ========================================
// Every form and every API route validates its input with these rules.
// Validation happens on the SERVER, so it cannot be bypassed by editing the
// page in the browser.
//
// HOW TO READ A RULE
//   z.string().min(2, 'Message shown when too short')
//   z.string().optional()                 -> may be missing
//   z.string().nullable()                 -> may be null (empty database value)
//
// The field names here must match the column names in prisma/schema.prisma.
// ========================================

import { z } from 'zod';
import {
  APPLICATION_STATUS_OPTIONS,
  CONTENT_GROUP_OPTIONS,
  DONATION_METHOD_OPTIONS,
  EVENT_STATUS_OPTIONS,
  MEMBERSHIP_STATUS_OPTIONS,
  MESSAGE_STATUS_OPTIONS,
  NEWS_TYPE_OPTIONS,
  PROGRAM_STATUS_OPTIONS,
  PROJECT_KIND_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '@/lib/constants';

// ========================================
// SMALL REUSABLE FIELD BUILDERS
// ========================================

/** Required text with a minimum length. */
const requiredText = (label: string, min = 1, max = 500) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(min, `${label} must be at least ${min} character(s).`)
    .max(max, `${label} must be shorter than ${max} characters.`);

/** Optional text: an empty box is stored as null (cleaner database). */
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

/** Email address. */
const emailField = (required = true) =>
  required
    ? z
        .string({ required_error: 'Email is required.' })
        .trim()
        .toLowerCase()
        .email('Please enter a valid email address.')
    : z
        .string()
        .trim()
        .toLowerCase()
        .email('Please enter a valid email address.')
        .optional()
        .nullable()
        .or(z.literal(''))
        .transform((value) => (value ? value : null));

/**
 * Boolean coming from a JSON body (Admin Panel) or a checkbox (HTML form).
 * Accepts: true/false, "true"/"false", 1/0, "on", "yes".
 */
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

/**
 * Date coming from an <input type="date"> (text) or from JSON.
 * Empty values become null so "no end date" is a valid, clean state.
 */
const dateField = () =>
  z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === '') return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    });

/** Whole number (used for sort order and donation amounts). */
const intField = (fallback: number | null = null) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === '') return fallback;
      const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
    });

/** A value that must be one of the allowed options. */
const optionField = (options: { value: string }[], fallback: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      const allowed = options.map((o) => o.value);
      const candidate = (value ?? '').toUpperCase();
      return allowed.includes(candidate) ? candidate : fallback;
    });

/** A required value that must be one of the allowed options. */
const requiredOptionField = (options: { value: string }[], label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .transform((value) => value.toUpperCase())
    .refine((value) => options.some((o) => o.value === value), {
      message: `Please choose a valid ${label.toLowerCase()}.`,
    });

// ========================================
// AUTHENTICATION SCHEMAS
// Used by app/api/auth/* and the login pages.
// ========================================
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
  remember: boolField(false),
  // Which login page the person used. "admin" makes the server refuse to
  // sign a normal member in through the admin page.
  portal: z
    .string()
    .optional()
    .transform((value) => (value === 'admin' ? 'admin' : 'member')),
});

export const memberRegisterSchema = z
  .object({
    name: requiredText('Full name', 2, 120),
    email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
    phone: optionalText(30),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(200, 'Password is too long.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  });

// Member updating their own profile from the Member Panel.
export const profileUpdateSchema = z.object({
  name: requiredText('Full name', 2, 120),
  phone: optionalText(30),
  address: optionalText(300),
  bio: optionalText(1000),
  photoUrl: optionalText(500),
});

// Changing your own password from the Member Panel.
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  });

// ========================================
// MEMBER MANAGEMENT (ADMIN PANEL)
// ========================================
// Members are created BY AN ADMINISTRATOR, never by themselves.
// The address fields below (district / municipality / ward) are the ones the
// organization needs for its own records and for the district reports.
export const memberCreateSchema = z.object({
  name: requiredText('Full name', 2, 120),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  // Optional on create: when it is left empty the server GENERATES a strong
  // starting password and the page shows it once (see the members page).
  password: z.string().max(200, 'Password is too long.').optional().nullable(),
  phone: optionalText(30),
  role: requiredOptionField([{ value: 'MEMBER' }, { value: 'ADMIN' }, { value: 'FINANCE_ADMIN' }, { value: 'SUPER_ADMIN' }], 'Role'),
  membershipNo: optionalText(60),
  designation: optionalText(120),
  // The area this member looks after, e.g. "Ward 3 - education". Shown in the
  // member's own profile and used to filter the member management table.
  workingArea: optionalText(160),
  department: optionalText(120),
  bio: optionalText(1000),
  photoUrl: optionalText(500),
  address: optionalText(300),
  // ---------- Address details ----------
  district: optionalText(80),
  municipality: optionalText(120),
  ward: optionalText(20),
  // ---------- Membership ----------
  status: optionField(MEMBERSHIP_STATUS_OPTIONS, 'PENDING'),
  joinedAt: dateField(),
  isPublic: boolField(false),
  isActive: boolField(true),
  // Should the verification email be sent straight away? (default yes)
  sendVerificationEmail: boolField(true),
});

export const memberUpdateSchema = memberCreateSchema.extend({
  // On edit the password is optional: leaving it empty keeps the old password.
  password: z.string().optional().nullable(),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
});

// ========================================
// EMAIL VERIFICATION AND PASSWORD RESET
// ========================================
export const verifyEmailSchema = z.object({
  // Either the link (token) or the typed code, depending on how they arrived.
  token: z.string().trim().optional().nullable(),
  email: z.string().trim().toLowerCase().optional().nullable(),
  code: z.string().trim().optional().nullable(),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().optional().nullable(),
    email: z.string().trim().toLowerCase().optional().nullable(),
    code: z.string().trim().optional().nullable(),
    password: z
      .string()
      .min(8, 'The new password must be at least 8 characters.')
      .max(200, 'Password is too long.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((data) => Boolean(data.token) || (Boolean(data.email) && Boolean(data.code)), {
    message: 'Open the link from your email, or type the email address and the 6 digit code.',
    path: ['code'],
  });

// ========================================
// PUBLIC FORMS
// ========================================
export const joinApplicationSchema = z.object({
  fullName: requiredText('Full name', 2, 120),
  phone: requiredText('Phone number', 6, 30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : null)),
  address: optionalText(300),
  areaOfInterest: optionalText(120),
  message: optionalText(2000),
  extraInfo: optionalText(1000),
  // Simple anti-spam honeypot: this box is hidden from real people.
  // A robot fills it in, so a filled value means "reject".
  website: z.string().optional().nullable(),
});

export const contactMessageSchema = z.object({
  name: requiredText('Your name', 2, 120),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  phone: optionalText(30),
  subject: optionalText(160),
  message: requiredText('Message', 10, 3000),
  website: z.string().optional().nullable(), // honeypot
});

// ========================================
// PROGRAMS SECTION
// ========================================
export const programSchema = z.object({
  title: requiredText('Program title', 3, 180),
  slug: optionalText(120),
  category: optionalText(80),
  summary: optionalText(400),
  description: optionalText(8000),
  objectives: optionalText(4000),
  results: optionalText(4000),
  targetGroup: optionalText(300),
  location: optionalText(180),
  startDate: dateField(),
  endDate: dateField(),
  status: optionField(PROGRAM_STATUS_OPTIONS, 'PLANNED'),
  imageUrl: optionalText(500),
  projectId: optionalText(60),
  isPublished: boolField(false),
  featured: boolField(false),
  sortOrder: intField(0),
});

// ========================================
// PROJECTS / OUR WORKS
// Note the "kind" field: "PROJECT" shows on /projects, "WORK" on /our-works.
// ========================================
export const projectSchema = z.object({
  title: requiredText('Title', 3, 180),
  slug: optionalText(120),
  kind: optionField(PROJECT_KIND_OPTIONS, 'PROJECT'),
  category: optionalText(80),
  summary: optionalText(400),
  description: optionalText(8000),
  objectives: optionalText(4000),
  activities: optionalText(4000),
  results: optionalText(4000),
  impact: optionalText(4000),
  beneficiaries: optionalText(2000),
  location: optionalText(180),
  startDate: dateField(),
  endDate: dateField(),
  status: optionField(PROJECT_STATUS_OPTIONS, 'PLANNED'),
  imageUrl: optionalText(500),
  isPublished: boolField(false),
  featured: boolField(false),
  sortOrder: intField(0),
});

// ========================================
// EVENTS SECTION
// ========================================
export const eventSchema = z.object({
  title: requiredText('Event title', 3, 180),
  slug: optionalText(120),
  summary: optionalText(400),
  description: optionalText(8000),
  startsAt: dateField(),
  endsAt: dateField(),
  location: optionalText(180),
  imageUrl: optionalText(500),
  registrationInfo: optionalText(1000),
  status: optionField(EVENT_STATUS_OPTIONS, 'UPCOMING'),
  isPublished: boolField(false),
  featured: boolField(false),
});

// ========================================
// NEWS / NOTICES
// ========================================
export const newsSchema = z.object({
  title: requiredText('Title', 3, 200),
  slug: optionalText(120),
  type: optionField(NEWS_TYPE_OPTIONS, 'NEWS'),
  category: optionalText(80),
  excerpt: optionalText(500),
  content: optionalText(20000),
  coverImageUrl: optionalText(500),
  publishedAt: dateField(),
  isPublished: boolField(false),
  featured: boolField(false),
});

// ========================================
// GALLERY SECTION
// ========================================
export const galleryAlbumSchema = z.object({
  title: requiredText('Album title', 2, 160),
  slug: optionalText(120),
  description: optionalText(1000),
  coverImageUrl: optionalText(500),
  category: optionalText(80),
  eventDate: dateField(),
  isPublished: boolField(true),
  sortOrder: intField(0),
});

export const galleryImageSchema = z.object({
  title: optionalText(240), // caption
  imageUrl: requiredText('Image link', 3, 500),
  category: optionalText(80),
  takenOn: dateField(),
  albumId: optionalText(60),
  programId: optionalText(60),
  projectId: optionalText(60),
  eventId: optionalText(60),

  // Which of the two places this photo belongs to. Anything unrecognised falls
  // back to the wall, so a mistaken value can never make a photo vanish.
  placement: z.enum(['GALLERY', 'SLIDER']).catch('GALLERY'),

  isPublished: boolField(true),
  sortOrder: intField(0),
});

// ========================================
// DONOR SECTION
// ========================================
export const donorSchema = z.object({
  name: requiredText('Donor name', 2, 160),

  // ---------- the four details the public detail panel is built from ----------
  // Address, purpose and description are required because they are what a visitor
  // reads after clicking a card; an empty one leaves a hole in the panel.
  // Occupation is genuinely optional and is left out of the panel when empty.
  address: requiredText('Address', 2, 200),
  occupation: optionalText(160),
  donationPurpose: requiredText('Donation purpose', 2, 200),
  description: requiredText('Short description', 10, 1000),

  organization: optionalText(160),
  logoUrl: optionalText(500),
  supportArea: optionalText(160),
  websiteUrl: optionalText(300),
  // isPublic must be switched on deliberately: by default a donor stays private.
  isPublic: boolField(false),
  isActive: boolField(true),
  sortOrder: intField(0),
});

// ========================================
// BENEFICIARIES SECTION
// beneficiaryCount is optional on purpose - empty means "not shown".
// ========================================
export const beneficiarySchema = z.object({
  name: requiredText('Category name', 2, 120),
  slug: optionalText(120),
  description: optionalText(1500),
  imageUrl: optionalText(500),
  iconKey: optionalText(40),
  beneficiaryCount: intField(null),
  countLabel: optionalText(80),
  isPublished: boolField(true),
  sortOrder: intField(0),
});

// ========================================
// CONTENT SECTIONS (LONG EDITABLE TEXT BLOCKS)
// ========================================
export const contentSectionSchema = z.object({
  title: requiredText('Heading', 2, 200),
  slug: optionalText(120),
  subtitle: optionalText(300),
  body: optionalText(20000),
  bulletList: optionalText(6000),
  imageUrl: optionalText(500),
  group: optionField(CONTENT_GROUP_OPTIONS, 'ABOUT'),
  sortOrder: intField(0),
  isPublished: boolField(true),
});

// ========================================
// DONATIONS (PRIVATE RECORDS)
// ========================================
export const donationSchema = z.object({
  donorName: requiredText('Donor name', 2, 160),
  donorEmail: emailField(false),
  amount: z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === 'number' ? value : Number.parseInt(value, 10)))
    .refine((value) => Number.isFinite(value) && value > 0, {
      message: 'Please enter an amount greater than zero.',
    }),
  currency: z.string().trim().min(1).max(8).optional().default('NPR'),
  method: optionField(DONATION_METHOD_OPTIONS, 'BANK_TRANSFER'),
  reference: optionalText(120),
  note: optionalText(1000),
  receivedOn: dateField(),
});

// ========================================
// TASKS (ADMIN -> MEMBER)
// ========================================
export const taskSchema = z.object({
  title: requiredText('Task title', 3, 180),
  description: optionalText(2000),
  status: optionField(TASK_STATUS_OPTIONS, 'TODO'),
  priority: optionField(TASK_PRIORITY_OPTIONS, 'NORMAL'),
  dueDate: dateField(),
  assignedToId: requiredText('Assigned member', 1, 60),
});

// ========================================
// STATUS-ONLY UPDATE
// Used by the Admin Panel when the administrator only changes a status
// (for example turning an application from NEW to APPROVED).
// ========================================
const allStatusValues = [
  ...APPLICATION_STATUS_OPTIONS,
  ...MESSAGE_STATUS_OPTIONS,
  ...PROGRAM_STATUS_OPTIONS,
  ...PROJECT_STATUS_OPTIONS,
  ...EVENT_STATUS_OPTIONS,
  ...TASK_STATUS_OPTIONS,
  ...MEMBERSHIP_STATUS_OPTIONS,
].map((option) => option.value);

export const statusUpdateSchema = z.object({
  status: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => allStatusValues.includes(value), {
      message: 'Unknown status value.',
    }),
  adminNote: optionalText(2000).optional(),
});

// ========================================
// SITE SETTINGS (ADMIN PANEL -> SETTINGS)
// Accepts any of the known setting keys with a text value.
// ========================================
export const settingsUpdateSchema = z.object({
  values: z.record(z.string(), z.string()),
});

// ========================================
// TYPE HELPERS
// Using these types keeps the Admin Panel forms in sync with the rules above.
// ========================================
export type LoginInput = z.infer<typeof loginSchema>;
export type MemberRegisterInput = z.infer<typeof memberRegisterSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type JoinApplicationInput = z.infer<typeof joinApplicationSchema>;
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
export type ProgramInput = z.infer<typeof programSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type NewsInput = z.infer<typeof newsSchema>;
export type DonorInput = z.infer<typeof donorSchema>;
export type GalleryImageInput = z.infer<typeof galleryImageSchema>;
export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;
export type DonationInput = z.infer<typeof donationSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
