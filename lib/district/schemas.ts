// ========================================
// DISTRICT WORK (77 DISTRICTS) - VALIDATION RULES
// ========================================
// The rules behind the "District activities" form in the Admin Panel.
//
// WHY THE DISTRICT IS CHECKED AGAINST A LIST
//   The 77 districts are fixed (see config/districts.ts). Checking the typed
//   value against that list means the analytics can never be broken by a typo
//   such as "Kathmando" or "kaski" - the counts would silently split in two.
//
// WHAT IS NOT HERE
//   There is no "total beneficiaries" field anywhere. Numbers are entered per
//   activity and added up when they are read (see lib/district/analytics.ts),
//   so a report can never disagree with the activities themselves.
// ========================================

import { z } from 'zod';
import { DISTRICT_NAMES } from '@/config/districts';

// ========================================
// TWO SMALL TEXT HELPERS
// ========================================
// They are written here rather than imported, because the shared validation
// file keeps its own helpers private. Copying these two tiny functions keeps
// this module independent - and the messages below are the ones this form
// shows, so they can be tuned without touching other features.

/** Text that must be filled in. */
function requiredText(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);
}

/** Text that may be left empty. An empty box becomes null, not an empty text. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));
}

// ========================================
// THE LISTS THE DROP-DOWNS USE
// ========================================
export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'EDUCATION', label: 'Education' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'WOMEN', label: 'Women empowerment' },
  { value: 'YOUTH', label: 'Youth leadership' },
  { value: 'ENVIRONMENT', label: 'Environment' },
  { value: 'RELIEF', label: 'Relief and support' },
  { value: 'SPORTS', label: 'Sports and culture' },
  { value: 'MEETING', label: 'Meeting / assembly' },
  { value: 'OTHER', label: 'Other' },
];

export const ACTIVITY_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/** The colours of the status badge, written out in full for the styling tool. */
export const ACTIVITY_STATUS_TONES: Record<string, string> = {
  PLANNED: 'bg-blue-50 text-blue-700 ring-blue-200',
  ONGOING: 'bg-amber-50 text-amber-700 ring-amber-200',
  COMPLETED: 'bg-green-50 text-green-700 ring-green-200',
  CANCELLED: 'bg-ink-100 text-ink-600 ring-ink-200',
};

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/** A friendly name for one activity type value. */
export function activityTypeLabel(value: string | null | undefined): string {
  return (
    ACTIVITY_TYPE_OPTIONS.find((option) => option.value === String(value ?? ''))?.label ??
    String(value ?? '—')
  );
}

// ========================================
// FIELDS
// ========================================
/** Whole numbers only, and never negative. Empty = "not recorded". */
const countField = (label: string) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((value, ctx) => {
      if (value === undefined || value === null || value === '') return null;

      const number = Math.trunc(Number(value));

      if (!Number.isFinite(number)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a number.` });
        return null;
      }
      if (number < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} cannot be negative.` });
        return null;
      }
      // A typo like 50000000 would ruin every total on the analytics screen.
      if (number > 10_000_000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} looks too large. Please check the figure.`,
        });
        return null;
      }

      return number;
    });

const districtField = z
  .string()
  .trim()
  .min(1, 'Please choose a district.')
  .refine((value) => DISTRICT_NAMES.includes(value), {
    message: 'Please choose a district from the list.',
  });

// ========================================
// ONE DISTRICT ACTIVITY
// ========================================
export const districtActivitySchema = z.object({
  // ---------- where ----------
  district: districtField,
  municipality: optionalText(120),
  ward: optionalText(20),

  // ---------- what ----------
  title: requiredText('Activity name', 2, 160),
  activityType: z.string().trim().min(1, 'Please choose the type of activity.'),
  description: optionalText(4000),

  // ---------- how many ----------
  // Empty is allowed and stays empty: we never invent a figure.
  beneficiaries: countField('Beneficiaries'),
  membersInvolved: countField('Members involved'),

  // ---------- when and how much ----------
  activityDate: z.coerce.date({ errorMap: () => ({ message: 'Please choose the date.' }) }),
  amountUsed: countField('Fund used'),
  status: z.string().trim().min(1).default('PLANNED'),
  responsibleTeam: optionalText(160),

  // ---------- proof ----------
  // One link per line (the same "lines" idea used by the programs and projects).
  photoUrls: optionalText(4000),
  documentUrls: optionalText(4000),
});

export const districtActivityUpdateSchema = districtActivitySchema.partial();
