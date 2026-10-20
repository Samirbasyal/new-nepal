// ========================================
// LANGUAGE (Nepali / English)
// ========================================
// One setting for the WHOLE website: site.language = 'en' | 'ne'.
// Stored in the settings table, so it survives refresh, logout and redeploy.
// Add a key to BOTH dictionaries; a missing Nepali entry falls back to English.

export type Lang = 'en' | 'ne';

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली' },
];

const en: Record<string, string> = {
  'nav.home': 'Home',
  'nav.about': 'About',
  'nav.programs': 'Programs',
  'nav.projects': 'Projects',
  'nav.karya': 'Karya Samiti',
  'nav.donors': 'Donors',
  'nav.contact': 'Contact',
  'nav.donate': 'Donate',
  'nav.login': 'Member login',
  'common.readMore': 'Read more',
  'common.back': 'Back',
  'common.save': 'Save changes',
  'footer.quickLinks': 'Quick links',
  'footer.contact': 'Contact',
  'footer.rights': 'All rights reserved.',
};

const ne: Record<string, string> = {
  'nav.home': 'गृहपृष्ठ',
  'nav.about': 'हाम्रोबारे',
  'nav.programs': 'कार्यक्रमहरू',
  'nav.projects': 'परियोजनाहरू',
  'nav.karya': 'कार्य समिति',
  'nav.donors': 'सहयोगीहरू',
  'nav.contact': 'सम्पर्क',
  'nav.donate': 'सहयोग गर्नुहोस्',
  'nav.login': 'सदस्य लगइन',
  'common.readMore': 'थप पढ्नुहोस्',
  'common.back': 'फर्कनुहोस्',
  'common.save': 'परिवर्तन सुरक्षित गर्नुहोस्',
  'footer.quickLinks': 'छिटो लिंकहरू',
  'footer.contact': 'सम्पर्क',
  'footer.rights': 'सर्वाधिकार सुरक्षित।',
};

const DICTIONARIES: Record<Lang, Record<string, string>> = { en, ne };

/** Translate one key. Falls back to English, then to the key itself. */
export function t(lang: Lang, key: string): string {
  return DICTIONARIES[lang]?.[key] ?? DICTIONARIES.en[key] ?? key;
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ne';
}
