// ========================================
// ORGANIZATION / WEBSITE SETTINGS
// ========================================
// This is the MAIN SETTINGS FILE for the public website.
// It controls: the organization name, the logo, the menu, the footer,
// the contact details and the social media links.
//
// IMPORTANT - TWO WAYS TO CHANGE THINGS:
//
//  1. QUICK FIX (this file)
//     The values below are the DEFAULT values. Change them here and they
//     are used immediately when the database has no other value.
//
//  2. THE PROPER WAY (Admin Panel -> Settings)
//     Anything you save in the Admin Panel is stored in the database and
//     OVERRIDES the values in this file. That is how the organization can
//     update its own contact details without touching code.
//
// The database keys used by the Admin Panel are listed in
// "lib/settings.ts" (SETTING_KEYS).
// ========================================

// ========================================
// ORGANIZATION LOGO
// Change the logo path from here.
// ========================================
// HOW TO REPLACE THE LOGO:
//   1. Put your own logo image in the folder:  public/branding/
//   2. Recommended file name:  logo.png  (a square image, 512x512 pixels,
//      transparent background works best)
//   3. Change the path below to: '/branding/logo.png'
//
// The placeholder logo that ships with the project is an SVG file:
// public/branding/logo-placeholder.svg
// You may also use an external link here, e.g.
//   src: 'https://your-domain.com/my-logo.png'
// ========================================
export const logo = {
  // Path of the logo file (inside the "public" folder).
  src: '/branding/logo.svg',
  // Text read out by screen readers and shown when the image cannot load.
  alt: 'Janakalyan Samataa Yuwa Club logo',
  // Optional second version for dark backgrounds (footer).
  srcOnDark: '/branding/logo-on-dark.svg',
  width: 48,
  height: 48,
  // Browser tab icon. Replace public/branding/favicon.svg with your own.
  favicon: '/branding/favicon.svg',
};

// ========================================
// ORGANIZATION INFORMATION
// This controls the website name and the organisation's basic identity.
// ========================================
export const organization = {
  // Full official name - used in the navbar, footer, page titles and SEO.
  name: 'Janakalyan Samataa Yuwa Club',
  // Short form used where space is limited (mobile navbar).
  shortName: 'JSYC',
  // One-line description shown under the name in the footer and in search results.
  tagline: 'A community youth club working for equality, dignity and local development.',
  // Longer description used for SEO metadata and the footer.
  // Replace with the organization's real description.
  description:
    'Janakalyan Samataa Yuwa Club is a community-based youth organization working with local people on education, health, women empowerment, youth leadership and community development.',
  // Year shown in the footer copyright line. Leave empty to use the current year.
  foundedYear: '',
  // Registration / affiliation details are deliberately left empty.
  // Add the real values through Admin Panel -> Settings once they are confirmed.
  registrationInfo: '',
};

// ========================================
// NAVBAR
// This controls the main menu links.
// To hide a link, delete its line (or add  hidden: true  and it is skipped).
// To add a page, create the folder in "app/" and add the link here.
// ========================================
// There are more links than fit comfortably in a navbar, so links with
// group: 'more' are collected into a "More" drop-down menu on desktop.
// On mobile every link is simply listed inside the menu.
export const navigation = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Programs', href: '/programs' },
  { label: 'Projects', href: '/projects' },
  { label: 'Events', href: '/events' },
  { label: 'News', href: '/news' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Our Works', href: '/our-works', group: 'more' as const },
  { label: 'Impact', href: '/impact', group: 'more' as const },
  { label: 'Members', href: '/members', group: 'more' as const },
  // कार्य समिति (working committee) - photo, name, post and current address only.
  { label: 'कार्य समिति', href: '/karya-samiti', group: 'more' as const },
  { label: 'Donors', href: '/donors', group: 'more' as const },
  { label: 'Join Us', href: '/join', group: 'more' as const },
  { label: 'Contact', href: '/contact', group: 'more' as const },
];

// The links that appear directly in the navbar (everything else goes to "More").
export const navPrimary = navigation.filter((item) => !('group' in item));
export const navMore = navigation.filter((item) => 'group' in item);

// Links shown as buttons on the right side of the navbar.
export const navigationActions = [
  { label: 'Donate', href: '/donate', style: 'accent' as const },
  { label: 'Member Login', href: '/member/login', style: 'outline' as const },
];

// Links shown in the mobile menu's bottom section.
export const mobileMenuExtras = [
  { label: 'Donate', href: '/donate' },
  { label: 'Member Login', href: '/member/login' },
  { label: 'Join Community', href: '/join' },
];

// ========================================
// CONTACT INFORMATION
// Default contact details. The Admin Panel (Settings) overrides these.
// ========================================
export const contact = {
  address: '[Add official organization address]',
  phone: '[Add official contact number]',
  phoneAlt: '',
  email: '[Add official email address]',
  officeHours: '[Add office hours]',
  // Google Maps embed address or a full embed URL. Empty = map is hidden.
  mapEmbedUrl: '',
  mapLinkUrl: '',
};

// ========================================
// SOCIAL MEDIA LINKS
// Leave a link empty ('') and the icon is hidden automatically.
// ========================================
export const social = {
  facebook: '',
  instagram: '',
  youtube: '',
  twitter: '',
  linkedin: '',
  tiktok: '',
};

// ========================================
// FOOTER
// This controls the footer text and the column layout.
// ========================================
export const footer = {
  // Short paragraph under the logo in the footer.
  aboutText:
    'We work together with local communities for equality, education, health and a better future for every family.',
  // Bottom line of the footer.
  copyrightText: 'All rights reserved.',
  // Extra small links in the bottom bar.
  legalLinks: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ],
};

// ========================================
// SEO DEFAULTS
// Used by app/layout.tsx for page titles and social sharing previews.
// ========================================
export const seo = {
  // Title template. "%s" is replaced by the page name.
  titleTemplate: '%s | Janakalyan Samataa Yuwa Club',
  defaultTitle: 'Janakalyan Samataa Yuwa Club',
  keywords: [
    'Janakalyan Samataa Yuwa Club',
    'community organization',
    'youth club',
    'NGO',
    'women empowerment',
    'community development',
  ],
};

// ========================================
// SINGLE EXPORT OBJECT
// Handy when a component needs several of the values above.
// ========================================
export const siteConfig = {
  logo,
  organization,
  navigation,
  navigationActions,
  mobileMenuExtras,
  contact,
  social,
  footer,
  seo,
};

export type NavItem = { label: string; href: string };
