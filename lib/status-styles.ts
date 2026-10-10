// ========================================
// STATUS BADGE COLOURS
// ========================================
// A single place that decides which colour a status badge uses.
// Change a colour here and it changes everywhere (public pages AND admin panel).
//
// Example: <Badge>{status}</Badge> renders "ONGOING" in blue.
// ========================================

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

// The list of status values comes from lib/constants.ts
export const STATUS_TONES: Record<string, BadgeTone> = {
  // Generic
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',

  // Membership
  PENDING: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  SUSPENDED: 'danger',

  // Programs / projects
  PLANNED: 'info',
  ONGOING: 'brand',
  COMPLETED: 'success',
  PAUSED: 'warning',

  // Events
  UPCOMING: 'brand',
  CANCELLED: 'danger',

  // Applications / messages
  NEW: 'accent',
  REVIEWING: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  READ: 'info',
  REPLIED: 'success',

  // Tasks
  TODO: 'neutral',
  IN_PROGRESS: 'brand',
  DONE: 'success',

  // Priority
  LOW: 'neutral',
  NORMAL: 'info',
  HIGH: 'danger',

  // News types
  NEWS: 'brand',
  NOTICE: 'accent',
  PRESS: 'info',
  STORY: 'success',

  // ========================================
  // FUND MANAGEMENT - PAYMENT STATUS
  // ========================================
  // PENDING is already "warning" and APPROVED/REJECTED/CANCELLED are defined
  // above, so the fund screens reuse exactly the same colours as the rest of
  // the Admin Panel.

  // ========================================
  // FUND MANAGEMENT - MONTHLY CONTRIBUTION STATUS
  // PAID is defined above as "success".
  // ========================================
  PARTIAL: 'info',
  OVERDUE: 'danger',
  WAIVED: 'neutral',

  // ========================================
  // NOTIFICATIONS
  // ========================================
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'danger',
};

/** Get the badge colour for a status value. Unknown values stay neutral. */
export function statusTone(status?: string | null): BadgeTone {
  if (!status) return 'neutral';
  return STATUS_TONES[status.toUpperCase()] ?? 'neutral';
}

/** Make "IN_PROGRESS" and "BANK_TRANSFER" readable: "In progress", "Bank transfer". */
export function humanizeStatus(status?: string | null): string {
  if (!status) return '';
  const lower = status.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Tailwind classes for each tone. Used by components/ui/Badge.tsx */
export const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200',
  success: 'bg-green-50 text-green-700 ring-green-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
};
