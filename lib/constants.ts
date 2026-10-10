// ========================================
// SHARED CONSTANTS (STATUS LISTS AND OPTIONS)
// ========================================
// These lists feed the dropdown menus in the Admin Panel and the coloured
// badges on the public website. Keeping them in ONE place means the
// database stays simple (plain text values) and the website stays consistent.
//
// If you add a new status, add it here AND add its colour in
// "lib/status-styles.ts".
// ========================================

// ========================================
// USER ROLES (used by AUTHENTICATION / AUTHORIZATION)
// PUBLIC = visitor who is not logged in
// MEMBER = normal registered member (can only use the Member Panel)
// ADMIN  = full access to the Admin Panel
//
// FUND MANAGEMENT ROLES
// FINANCE_ADMIN = full Admin Panel access PLUS can record expenses and
//                 verify member payments. Cannot approve expenses.
// SUPER_ADMIN   = everything, including approving expenses and moving money
//                 records. At least one must exist.
// ========================================
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  FINANCE_ADMIN: 'FINANCE_ADMIN',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_OPTIONS = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'FINANCE_ADMIN', label: 'Finance Administrator' },
  { value: 'SUPER_ADMIN', label: 'Super Administrator' },
];

// ========================================
// WHICH ROLES MAY OPEN THE ADMIN PANEL
// Add a new role here and the whole Admin Panel opens up for it.
// ========================================
export const ADMIN_ROLES: string[] = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'ADMIN'];

/** True for any role that is allowed to use the Admin Panel. */
export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(String(role));
}

/** Only a Super Administrator may approve expenses. */
export function isSuperAdminRole(role: string | undefined | null): boolean {
  return role === 'SUPER_ADMIN';
}

/** Roles that may record an expense (everything except a plain member). */
export function canRecordExpenseRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(String(role));
}

/**
 * Turn whatever is stored in the database into a role we recognise.
 * An unknown value becomes MEMBER, which is the least powerful role - so a
 * typo in the database can never hand somebody more power than intended.
 */
export function normalizeRole(role: string | undefined | null): Role {
  const value = String(role ?? '');
  const known: Role[] = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'ADMIN', 'MEMBER'];
  return known.includes(value as Role) ? (value as Role) : 'MEMBER';
}

// ========================================
// MEMBERSHIP STATUS
// ========================================
export const MEMBERSHIP_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export const MEMBERSHIP_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

// ========================================
// PROGRAMS - STATUS
// ========================================
export const PROGRAM_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PAUSED', label: 'Paused' },
];

// ========================================
// PROJECTS / OUR WORKS
// "kind" decides which public page an entry appears on:
//   PROJECT -> /projects
//   WORK    -> /our-works
// ========================================
export const PROJECT_KIND_OPTIONS = [
  { value: 'PROJECT', label: 'Project' },
  { value: 'WORK', label: 'Our Work' },
];

export const PROJECT_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PAUSED', label: 'Paused' },
];

// ========================================
// EVENTS - STATUS
// ========================================
export const EVENT_STATUS_OPTIONS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ONGOING', label: 'Happening now' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// ========================================
// NEWS / NOTICES - TYPE
// ========================================
export const NEWS_TYPE_OPTIONS = [
  { value: 'NEWS', label: 'News' },
  { value: 'NOTICE', label: 'Notice' },
  { value: 'PRESS', label: 'Press release' },
  { value: 'STORY', label: 'Story' },
];

// ========================================
// JOIN COMMUNITY APPLICATIONS - STATUS
// ========================================
export const APPLICATION_STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'REVIEWING', label: 'Reviewing' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

// ========================================
// CONTACT MESSAGES - STATUS
// ========================================
export const MESSAGE_STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'READ', label: 'Read' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'ARCHIVED', label: 'Archived' },
];

// ========================================
// TASKS (shown in the Member Panel)
// ========================================
export const TASK_STATUS_OPTIONS = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
];

// ========================================
// DONATIONS - HOW THE MONEY WAS RECEIVED
// ========================================
export const DONATION_METHOD_OPTIONS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'QR', label: 'QR code' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online gateway' },
  { value: 'OTHER', label: 'Other' },
];

// ========================================
// FUND MANAGEMENT - PAYMENT STATUS
// Only APPROVED payments count towards the fund balance.
// ========================================
export const PAYMENT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending verification' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// How a member paid into the fund (bank transfer, wallet, QR, cash...).
// ESEWA and KHALTI were added with the Super Admin payment settings, so the
// office can show its eSewa / Khalti number and QR code next to the banks.
export const PAYMENT_METHOD_OPTIONS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'ESEWA', label: 'eSewa' },
  { value: 'KHALTI', label: 'Khalti' },
  { value: 'QR', label: 'QR payment' },
  { value: 'CASH', label: 'Cash (handed to the office)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Other online / wallet' },
  { value: 'OTHER', label: 'Other' },
];

// ========================================
// PAYMENT SETTINGS - WHICH SERVICE AN ACCOUNT BELONGS TO
// ========================================
// Used by Super Admin -> Payment settings (the screen in the Admin Panel where
// the eSewa number, the Khalti number, the bank accounts and every QR code are
// kept). Members are shown all the ACTIVE rows, grouped by this value.
export const PAYMENT_ACCOUNT_TYPE_OPTIONS = [
  { value: 'BANK', label: 'Bank account' },
  { value: 'ESEWA', label: 'eSewa wallet' },
  { value: 'KHALTI', label: 'Khalti wallet' },
  { value: 'OTHER', label: 'Other method' },
];

/** A friendly name for one account type, e.g. "eSewa wallet". */
export function paymentAccountTypeLabel(type: string | null | undefined): string {
  return (
    PAYMENT_ACCOUNT_TYPE_OPTIONS.find((option) => option.value === String(type ?? 'BANK'))?.label ??
    'Bank account'
  );
}

/**
 * Which PAYMENT_METHOD should be recorded when a member pays into an account?
 *
 * The office fills in "Payment method" on each account (BANK / ESEWA / KHALTI),
 * and every payment keeps that value. The reports can then honestly say how much
 * came in through a bank transfer and how much through a wallet.
 */
export function paymentMethodForAccount(type: string | null | undefined): string {
  switch (String(type ?? 'BANK').toUpperCase()) {
    case 'ESEWA':
      return 'ESEWA';
    case 'KHALTI':
      return 'KHALTI';
    case 'OTHER':
      return 'OTHER';
    default:
      return 'BANK_TRANSFER';
  }
}

// How the organization paid money out (used by the Expense form).
export const EXPENSE_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online transfer' },
  { value: 'OTHER', label: 'Other' },
];

// ========================================
// FUND MANAGEMENT - MONTHLY CONTRIBUTION STATUS
// ========================================
export const CONTRIBUTION_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIAL', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'WAIVED', label: 'Waived' },
];

// ========================================
// FUND MANAGEMENT - EXPENSE STATUS
// Only APPROVED expenses are subtracted from the fund balance.
// ========================================
export const EXPENSE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

// ========================================
// NOTIFICATIONS
// ========================================
export const NOTIFICATION_TYPE_OPTIONS = [
  { value: 'INFO', label: 'Information' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Problem' },
];

// ========================================
// CONTENT SECTION GROUPS
// Used on the About page and other pages whose text is editable
// from Admin Panel -> Content Sections.
// ========================================
export const CONTENT_GROUP_OPTIONS = [
  { value: 'ABOUT', label: 'About page' },
  { value: 'HOME', label: 'Homepage' },
  { value: 'WOMEN', label: 'Women Empowered' },
  { value: 'BENEFICIARIES', label: 'Beneficiaries' },
  { value: 'IMPACT', label: 'Impact' },
  { value: 'JOIN', label: 'Join Community' },
  { value: 'DONATE', label: 'Donate' },
];

// ========================================
// AREAS OF INTEREST (Join Community form dropdown)
// Add or remove options freely - these are just suggestions for volunteers.
// ========================================
export const AREA_OF_INTEREST_OPTIONS = [
  'General volunteering',
  'Education / teaching',
  'Health / first aid',
  'Women empowerment',
  'Youth leadership',
  'Sports and culture',
  'Environment and sanitation',
  'Fundraising / sponsorship',
  'Media and documentation',
  'Other',
];

// ========================================
// PAGINATION
// How many items are shown per page in the public listings.
// ========================================
export const PAGE_SIZE = 9;

// ========================================
// PLACEHOLDER TEXT
// Shown when the organization has not entered real information yet.
// We never invent numbers, achievements or stories - we show these instead.
// ========================================
export const PLACEHOLDER = {
  text: '[Add organization description]',
  number: '[Add actual number]',
  contact: '[Add official contact details]',
  image: 'Image not added yet',
};

export const SESSION_COOKIE_NAME = 'jsyc_session';
