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
  'nav.ourWorks': 'Our Work',
  'nav.members': 'Our Members',
  'nav.donors': 'Our Donors & Supporters',
  'nav.contact': 'Contact',
  'nav.projects': 'Projects',
  'nav.events': 'Events',
  'nav.news': 'News',
  'nav.gallery': 'Gallery',
  'nav.impact': 'Impact',
  'nav.karya': 'Karya Samiti',
  'nav.join': 'Join Us',
  'nav.donate': 'Donate',
  'nav.login': 'Member Login',
  'nav.privacy': 'Privacy',
  'footer.explore': 'Explore',
};

const ne: Record<string, string> = {
  'nav.home': 'गृहपृष्ठ',
  'nav.about': 'हाम्रोबारे',
  'nav.programs': 'कार्यक्रमहरू',
  'nav.ourWorks': 'हाम्रा कामहरू',
  'nav.members': 'हाम्रा सदस्यहरू',
  'nav.donors': 'सहयोगीहरू',
  'nav.contact': 'सम्पर्क',
  'nav.projects': 'परियोजनाहरू',
  'nav.events': 'कार्यक्रम/उत्सव',
  'nav.news': 'समाचार',
  'nav.gallery': 'ग्यालरी',
  'nav.impact': 'प्रभाव',
  'nav.karya': 'कार्य समिति',
  'nav.join': 'सामेल हुनुहोस्',
  'nav.donate': 'सहयोग गर्नुहोस्',
  'nav.login': 'सदस्य लगइन',
  'nav.privacy': 'गोपनीयता',
  'footer.explore': 'अन्वेषण',
};

const DICTIONARIES: Record<Lang, Record<string, string>> = { en, ne };

/** Which dictionary key belongs to which public address. */
export const NAV_KEY_BY_HREF: Record<string, string> = {
  '/': 'nav.home',
  '/about': 'nav.about',
  '/programs': 'nav.programs',
  '/our-works': 'nav.ourWorks',
  '/members': 'nav.members',
  '/donors': 'nav.donors',
  '/contact': 'nav.contact',
  '/projects': 'nav.projects',
  '/events': 'nav.events',
  '/news': 'nav.news',
  '/gallery': 'nav.gallery',
  '/impact': 'nav.impact',
  '/karya-samiti': 'nav.karya',
  '/join': 'nav.join',
  '/donate': 'nav.donate',
  '/member/login': 'nav.login',
  '/privacy': 'nav.privacy',
};

/** Translate one key. Falls back to English, then to the key itself. */
export function t(lang: Lang, key: string): string {
  return DICTIONARIES[lang]?.[key] ?? DICTIONARIES.en[key] ?? key;
}

/** Translate a menu label using its address; unknown addresses keep their label. */
export function tHref(lang: Lang, href: string, fallback: string): string {
  const key = NAV_KEY_BY_HREF[href];
  return key ? t(lang, key) : fallback;
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ne';
}
