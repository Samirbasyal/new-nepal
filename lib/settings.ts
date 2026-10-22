// ========================================
// EDITABLE WEBSITE SETTINGS
// ========================================
// The organization can change its own contact details, donation details and
// homepage text from:  Admin Panel -> Settings
//
// Those values are stored in the "site_settings" database table.
// This file reads them and falls back to the defaults in "config/site.ts"
// when a value has not been filled in yet.
//
// That is why the website never shows invented information: an empty setting
// simply shows the default placeholder from config/site.ts, for example
// "[Add official contact number]".
// ========================================

import { cache } from 'react';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { contact as defaultContact, organization as defaultOrganization, social as defaultSocial } from '@/config/site';

// ========================================
// THE COMPLETE LIST OF EDITABLE SETTINGS
// ========================================
// "key"     = the name used in the database (do not change it once in use)
// "label"   = what the administrator sees in the Admin Panel
// "group"   = which box on the Settings page it appears in
// "default" = the value used when nothing has been saved yet
//
// ABOUT THE PLACEHOLDERS IN SQUARE BRACKETS:
//   They are intentional. Replace them with the organization's real details.
//   We do not invent phone numbers, addresses, statistics or achievements.
// ========================================
export const SETTING_DEFINITIONS = [
  // --- Organization identity ---
  { key: 'site.language', label: 'Website language (en / ne)', group: 'ORGANIZATION', default: 'en', type: 'text' },
  { key: 'org.name', label: 'Organization name', group: 'ORGANIZATION', default: defaultOrganization.name, type: 'text' },
  { key: 'org.tagline', label: 'Tagline (one line)', group: 'ORGANIZATION', default: defaultOrganization.tagline, type: 'text' },
  { key: 'org.description', label: 'Short description', group: 'ORGANIZATION', default: defaultOrganization.description, type: 'textarea' },
  { key: 'org.foundedYear', label: 'Established year (optional)', group: 'ORGANIZATION', default: '', type: 'text' },
  { key: 'org.registrationInfo', label: 'Registration / affiliation details (optional)', group: 'ORGANIZATION', default: '', type: 'text' },

  // --- Contact details ---
  { key: 'contact.address', label: 'Office address', group: 'CONTACT', default: defaultContact.address, type: 'text' },
  { key: 'contact.phone', label: 'Phone number', group: 'CONTACT', default: defaultContact.phone, type: 'text' },
  { key: 'contact.phoneAlt', label: 'Second phone number (optional)', group: 'CONTACT', default: '', type: 'text' },
  { key: 'contact.email', label: 'Email address', group: 'CONTACT', default: defaultContact.email, type: 'text' },
  { key: 'contact.officeHours', label: 'Office hours', group: 'CONTACT', default: defaultContact.officeHours, type: 'text' },
  { key: 'contact.mapEmbedUrl', label: 'Google Maps embed link (optional)', group: 'CONTACT', default: '', type: 'text' },
  { key: 'contact.mapLinkUrl', label: 'Google Maps share link (optional)', group: 'CONTACT', default: '', type: 'text' },

  // --- Social media (leave empty to hide the icon) ---
  { key: 'social.facebook', label: 'Facebook page link', group: 'SOCIAL', default: '', type: 'text' },
  { key: 'social.instagram', label: 'Instagram link', group: 'SOCIAL', default: '', type: 'text' },
  { key: 'social.youtube', label: 'YouTube channel link', group: 'SOCIAL', default: '', type: 'text' },
  { key: 'social.twitter', label: 'X / Twitter link', group: 'SOCIAL', default: '', type: 'text' },
  { key: 'social.linkedin', label: 'LinkedIn link', group: 'SOCIAL', default: '', type: 'text' },
  { key: 'social.tiktok', label: 'TikTok link', group: 'SOCIAL', default: '', type: 'text' },

  // --- Home page photos ---
  // How many pictures the homepage shows. "0" hides that part completely.
  { key: 'home.heroPhotoCount', label: 'Photos rotating behind the hero heading (0-12)', group: 'HOMEPAGE', default: '4', type: 'text' },
  { key: 'home.galleryPhotoCount', label: 'Photos in the homepage gallery (0-12)', group: 'HOMEPAGE', default: '6', type: 'text' },

  // --- Homepage hero ---
  { key: 'home.heroTitle', label: 'Homepage main heading', group: 'HOMEPAGE', default: 'Welcome to Our Club', type: 'text' },
  {
    key: 'home.heroSubtitle',
    label: 'Homepage sub heading',
    group: 'HOMEPAGE',
    default:
      'We are a community youth organization working together for equality, dignity, social justice, and sustainable community development in Bajhang, Nepal.',
    type: 'textarea',
  },
  { key: 'home.heroImageUrl', label: 'Homepage hero image link (optional)', group: 'HOMEPAGE', default: '', type: 'text' },

  // The photograph beside the "Community-Based Youth Organization" text.
  // Leave it empty and that column shows the areas-of-work card instead.
  { key: 'home.aboutImageUrl', label: 'About section photo link (optional)', group: 'HOMEPAGE', default: '', type: 'text' },

  { key: 'home.aboutTitle', label: 'Introduction heading', group: 'HOMEPAGE', default: 'Community-Based Youth Organization', type: 'text' },
  { key: 'home.aboutBody', label: 'Introduction paragraph', group: 'HOMEPAGE', default: defaultOrganization.description, type: 'textarea' },

  // --- Donate page (NO secrets here - safe public information only) ---
  { key: 'donate.intro', label: 'Donate page introduction', group: 'DONATE', default: 'Your contribution helps us continue our work with local communities.', type: 'textarea' },
  { key: 'donate.bankName', label: 'Bank name', group: 'DONATE', default: '', type: 'text' },
  { key: 'donate.bankAccountName', label: 'Account holder name', group: 'DONATE', default: '', type: 'text' },
  { key: 'donate.bankAccountNumber', label: 'Account number', group: 'DONATE', default: '', type: 'text' },
  { key: 'donate.bankBranch', label: 'Branch', group: 'DONATE', default: '', type: 'text' },
  // The QR picture is uploaded on  Admin Panel -> Donations -> Bank & QR details.
  // What is stored here is the address that upload produced, never a made-up one.
  { key: 'donate.qrImageUrl', label: 'QR code picture (set it on Donations -> Bank & QR details)', group: 'DONATE', default: '', type: 'text' },
  // eSewa is offered to a donor ONLY while an ID is filled in here. An empty
  // field hides the method, so the website never asks for money to an account
  // that does not exist.
  { key: 'donate.esewaId', label: 'eSewa ID / mobile number (empty hides eSewa)', group: 'DONATE', default: '', type: 'text' },
  { key: 'donate.esewaName', label: 'eSewa account holder name', group: 'DONATE', default: '', type: 'text' },
  { key: 'donate.paymentNote', label: 'Instructions shown above the payment details', group: 'DONATE', default: '', type: 'textarea' },
  { key: 'donate.otherMethods', label: 'Other ways to give (one per line)', group: 'DONATE', default: '', type: 'textarea' },
  { key: 'donate.note', label: 'Extra note shown under the options', group: 'DONATE', default: 'Please contact us after transferring so we can send you a receipt.', type: 'textarea' },

  // --- Impact numbers ---
  // IMPORTANT: these are EMPTY on purpose. The website hides the number
  // block when the value is empty, so we never publish invented statistics.
  // Fill them in only with real, verifiable numbers.
  { key: 'impact.label1', label: 'Impact number 1 - description', group: 'IMPACT', default: '', type: 'text' },
  { key: 'impact.value1', label: 'Impact number 1 - value', group: 'IMPACT', default: '', type: 'text' },
  { key: 'impact.label2', label: 'Impact number 2 - description', group: 'IMPACT', default: '', type: 'text' },
  { key: 'impact.value2', label: 'Impact number 2 - value', group: 'IMPACT', default: '', type: 'text' },
  { key: 'impact.label3', label: 'Impact number 3 - description', group: 'IMPACT', default: '', type: 'text' },
  { key: 'impact.value3', label: 'Impact number 3 - value', group: 'IMPACT', default: '', type: 'text' },
  { key: 'impact.label4', label: 'Impact number 4 - description', group: 'IMPACT', default: '', type: 'text' },
  { key: 'impact.value4', label: 'Impact number 4 - value', group: 'IMPACT', default: '', type: 'text' },

  // --- Join Community page ---
  { key: 'join.intro', label: 'Join Community page introduction', group: 'JOIN', default: 'Become part of our community. Fill in the form and our team will contact you.', type: 'textarea' },
  // NOTE: this switch only affects the OLD direct-registration endpoint
  // (/api/auth/register), which stays closed. It does NOT switch off the
  // membership request form on /member/portal: that form never creates an
  // account by itself, an administrator has to approve every request first.
  { key: 'join.registrationEnabled', label: 'Allow direct self-registration (legacy endpoint - leave false)', group: 'JOIN', default: 'false', type: 'text' },

  // --- Fund Management (Donation & Fund System) ---
  // These values drive the monthly fund calculation and the member payment
  // page, so the organization never has to edit code to change them.
  { key: 'fund.monthlyAmount', label: 'Monthly member fund amount (whole rupees)', group: 'FUND', default: '20', type: 'text' },
  { key: 'fund.currency', label: 'Currency code (for example NPR)', group: 'FUND', default: 'NPR', type: 'text' },
  { key: 'fund.dueDay', label: 'Monthly payment is due on this day of the month', group: 'FUND', default: '15', type: 'text' },
  { key: 'fund.billingStartMonth', label: 'First month the monthly fund applies from (YYYY-MM, empty = this month)', group: 'FUND', default: '', type: 'text' },
  { key: 'fund.intro', label: 'Message shown on the member Monthly Fund page', group: 'FUND', default: 'Your monthly contribution keeps our community programs running. Please transfer the amount to one of the accounts below, then submit the payment details so the office can verify it.', type: 'textarea' },
  { key: 'fund.receiptRequired', label: 'Require a receipt/screenshot with every payment (true / false)', group: 'FUND', default: 'true', type: 'text' },
  { key: 'fund.allowPartial', label: 'Allow partial monthly payments (true / false)', group: 'FUND', default: 'true', type: 'text' },
  { key: 'fund.maxReceiptMb', label: 'Maximum receipt file size in MB', group: 'FUND', default: '5', type: 'text' },

  // --- Karya Samiti (committee) ---
  { key: 'karya.intro', label: 'Introduction shown above the committee list', group: 'KARYA', default: 'Our कार्य समिति (working committee) is elected by the members. It plans the work of the organization and is answerable to the general assembly.', type: 'textarea' },
  { key: 'karya.showFormer', label: 'Also show former committee members on the public page (true / false)', group: 'KARYA', default: 'false', type: 'text' },

  // --- Loan management ---
  { key: 'loan.intro', label: 'Introduction shown in the loan section', group: 'LOAN', default: 'Loans are given to members only, after a written agreement is signed. Loan money is kept completely separate from the monthly member fund.', type: 'textarea' },
  { key: 'loan.currency', label: 'Currency code for loans (for example NPR)', group: 'LOAN', default: 'NPR', type: 'text' },
  // The organization decides whether the signed paper must be recorded before a
  // loan can be approved. Off by default, because the office often approves
  // first and collects the signature when the money is handed over.
  { key: 'loan.requireAgreementBeforeApproval', label: 'Require the signed agreement before a loan can be approved (true / false)', group: 'LOAN', default: 'false', type: 'text' },
  { key: 'loan.defaultReturnMonths', label: 'Default repayment period in months (used as a suggestion)', group: 'LOAN', default: '12', type: 'text' },

  // --- District work ---
  { key: 'district.intro', label: 'Introduction shown in the district work section', group: 'DISTRICT', default: 'Activities carried out across Nepal, district by district.', type: 'textarea' },
];

export type SettingDefinition = (typeof SETTING_DEFINITIONS)[number];
export type SettingsMap = Record<string, string>;

// ========================================
// DEFAULT VALUES (from the definitions above)
// ========================================
export function defaultSettings(): SettingsMap {
  const map: SettingsMap = {};
  for (const def of SETTING_DEFINITIONS) map[def.key] = def.default;
  return map;
}

// ========================================
// READ ALL SETTINGS FROM THE DATABASE
// cache() makes sure we only query the database once per page request,
// even when several components ask for the settings.
// ========================================
export const getSettings = cache(async (): Promise<SettingsMap> => {
  const defaults = defaultSettings();
  if (!isDatabaseConfigured()) return defaults;

  try {
    const rows = await prisma.siteSetting.findMany();
    const merged: SettingsMap = { ...defaults };
    for (const row of rows) {
      // Only override defaults for keys we know about.
      if (row.key in defaults) merged[row.key] = row.value;
    }
    return merged;
  } catch (error) {
    console.error('[settings] could not read site settings:', error);
    return defaults;
  }
});

// ========================================
// CONVENIENCE HELPERS
// ========================================

/**
 * Read one setting. An empty saved value falls back to the default, which
 * means the website shows the "[Add ...]" placeholder instead of a blank space.
 */
export function setting(settings: SettingsMap, key: string, fallback = ''): string {
  const value = settings[key];
  if (value === undefined || value === null || value.trim() === '') {
    const def = SETTING_DEFINITIONS.find((d) => d.key === key);
    return def?.default?.trim() ? def.default : fallback;
  }
  return value;
}

/** True when the organization has saved a real value (not empty, not a placeholder). */
export function hasRealValue(value?: string | null): boolean {
  const text = (value ?? '').trim();
  if (!text) return false;
  // Values that still contain "[Add" are the shipped placeholders.
  return !/^\[add/i.test(text);
}

/**
 * Group the definitions so the Settings page can render one box per group.
 */
export function settingsByGroup() {
  const groups = new Map<string, SettingDefinition[]>();
  for (const def of SETTING_DEFINITIONS) {
    const list = groups.get(def.group) ?? [];
    list.push(def);
    groups.set(def.group, list);
  }
  return groups;
}

/** Nice titles for each group of settings. */
export const SETTING_GROUP_TITLES: Record<string, string> = {
  ORGANIZATION: 'Organization identity',
  CONTACT: 'Contact information',
  SOCIAL: 'Social media links',
  HOMEPAGE: 'Homepage content',
  DONATE: 'Donation information',
  IMPACT: 'Impact numbers (leave empty to hide)',
  JOIN: 'Join community page',
};

// ========================================
// READ ONE SETTING DIRECTLY (used by API routes)
// ========================================
// getSettings() above uses React's cache(), which is perfect inside pages.
// API route handlers sometimes need a single fresh value, so this simpler
// helper reads just one row.
export async function readSettingValue(key: string, fallback = ''): Promise<string> {
  if (!isDatabaseConfigured()) return fallback;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    const value = row?.value?.trim();
    return value ? value : fallback;
  } catch {
    return fallback;
  }
}

// ========================================
// IS PUBLIC MEMBER REGISTRATION ALLOWED?
// ========================================
// Priority:
//   1. the value saved in the Admin Panel (Settings -> join.registrationEnabled)
//   2. otherwise the MEMBER_REGISTRATION_ENABLED value in your .env file
//   3. otherwise "false"
//
// THE DEFAULT IS OFF. Members are created by an administrator from
// Admin Panel -> Members -> Add member, and nowhere else. Turning this on is
// not enough by itself either: app/api/auth/register also requires the
// ALLOW_MEMBER_SELF_REGISTRATION environment variable to be "true".
export async function isRegistrationEnabled(): Promise<boolean> {
  const stored = await readSettingValue('join.registrationEnabled', '');
  const value = stored || process.env.MEMBER_REGISTRATION_ENABLED || 'false';
  return value.toLowerCase().trim() === 'true';
}

// Re-export the config defaults so other files can compare against them.
export const configDefaults = {
  organization: defaultOrganization,
  contact: defaultContact,
  social: defaultSocial,
};
