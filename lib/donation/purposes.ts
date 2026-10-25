// ========================================
// DONATIONS - THE PURPOSES A DONOR CAN CHOOSE
// ========================================
// ONE list, used by every screen. If a new purpose is ever needed, it is added
// HERE and nowhere else - the landing page, the cards and the admin screens all
// read from this file, so they can never drift apart.
//
// WHY THE CODES ARE SHORT AND UPPERCASE
//   The code ("HEALTH") is what gets stored in the database and what reports
//   group by. The label ("Health and Medical Support") is only what a person
//   reads, so the wording can be improved later without touching old records.
//
// THE LAST OPTION
//   "Other / General Donation" is deliberately last, and it is the only one that
//   asks the donor for their own words.
// ========================================

import type { IconName } from '@/components/ui/Icon';

export type DonationPurposeOption = {
  /** Stored in the database. Never change it once donations exist. */
  code: string;
  /** Shown on the cards. Safe to reword at any time. */
  label: string;
  /** One short line so a donor knows what the money is used for. */
  description: string;
  icon: IconName;
  /** Show the "please explain" box when this one is chosen. */
  asksForOwnWords?: boolean;
};

export const DONATION_PURPOSES = [
  {
    code: 'HEALTH',
    label: 'Health and Medical Support',
    description: 'Treatment costs, medicines and health camps for people who cannot afford them.',
    icon: 'stethoscope',
  },
  {
    code: 'EDUCATION',
    label: 'Education and Student Support',
    description: 'School materials, fees and study support for students in need.',
    icon: 'book',
  },
  {
    code: 'FINANCIAL_HARDSHIP',
    label: 'Support for People in Financial Difficulty',
    description: 'Direct help for families going through a hard time.',
    icon: 'heart-handshake',
  },
  {
    code: 'WOMEN_SAFETY',
    label: 'Support for Women Affected by Domestic Violence',
    description: 'Safety, legal guidance and rehabilitation support.',
    icon: 'shield',
  },
  {
    code: 'CASTE_EQUALITY',
    label: 'Support Against Caste-Based Discrimination',
    description: 'Awareness work and support for people facing discrimination.',
    icon: 'users',
  },
  {
    code: 'DISASTER_RELIEF',
    label: 'Emergency and Disaster Relief',
    description: 'Rapid help with food, shelter and essentials after a disaster.',
    icon: 'alert',
  },
  {
    code: 'FOOD_SECURITY',
    label: 'Food and Basic Needs',
    description: 'Rice, oil, clothes and everyday essentials for households that are struggling.',
    icon: 'leaf',
  },
  {
    code: 'COMMUNITY',
    label: 'Community Development',
    description: 'Cleanliness, environment and shared community improvements.',
    icon: 'home',
  },
  {
    code: 'GENERAL',
    label: 'General Donation',
    description: 'Let the club use your gift wherever it is needed most.',
    icon: 'heart',
  },
  {
    // Kept apart from GENERAL on purpose. "Use it where it is needed" and "I have
    // something else in mind" are different intentions, and the office reads the
    // second one to find out what the donor actually meant.
    code: 'OTHER',
    label: 'Other',
    description: 'Something else - describe it in your own words.',
    icon: 'sparkles',
    asksForOwnWords: true,
  },
] as const satisfies readonly DonationPurposeOption[];

export type DonationPurposeCode = (typeof DONATION_PURPOSES)[number]['code'];

/** Every code, for validation. */
export const DONATION_PURPOSE_CODES = DONATION_PURPOSES.map((purpose) => purpose.code);

/** Look one up by its code. Returns undefined for anything unknown. */
export function findPurpose(code: string): DonationPurposeOption | undefined {
  return DONATION_PURPOSES.find((purpose) => purpose.code === code);
}

/**
 * The text saved in Donation.purpose.
 *
 * Stored as "Health and Medical Support" rather than "HEALTH" so that the
 * existing Donation Management screens, which simply print the purpose column,
 * keep reading naturally. For the "Other" option the donor's own words are
 * kept, so the office can see what they actually meant.
 */
export function purposeForStorage(code: string, ownWords?: string | null): string {
  const purpose = findPurpose(code);
  const label = purpose?.label ?? code;

  const extra = (ownWords ?? '').trim();
  if (!purpose?.asksForOwnWords || extra === '') return label;

  return `${label} - ${extra}`.slice(0, 300);
}
