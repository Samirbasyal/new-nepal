// ========================================
// ICONS
// ========================================
// All small drawings used across the website.
// They are inline SVG shapes, which means:
//   - no extra library to install
//   - they load instantly with the page
//   - they inherit the text colour (currentColor)
//
// USAGE:  <Icon name="phone" className="h-5 w-5" />
//
// ADDING AN ICON: add a new line to the ICON_PATHS object below.
// ========================================

import type { SVGProps } from 'react';

export type IconName = keyof typeof ICON_PATHS;

// Every value is the "d" attribute of an SVG path (a 24x24 drawing).
const ICON_PATHS = {
  // --- Navigation ---
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-up-right': 'M7 17L17 7M8 7h9v9',

  // --- Contact ---
  phone: 'M4 4h4l2 5-2.5 1.5a12 12 0 006 6L15 14l5 2v4a1 1 0 01-1 1A15 15 0 013 5a1 1 0 011-1z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  'map-pin': 'M12 22s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 13a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z',

  // --- People ---
  users: 'M16 20v-1.5a4 4 0 00-4-4H7a4 4 0 00-4 4V20M9.5 10.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1.5a4 4 0 00-3-3.9M16 3.7a4 4 0 010 7.6',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  'user-plus': 'M15 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6',

  // --- Actions ---
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4l10-10-4-4L4 16v4zM14 6l4 4',
  trash: 'M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  // The photo viewer's magnifier: with a plus, and with a minus.
  'zoom-in': 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M8 11h6M11 8v6',
  'zoom-out': 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M8 11h6',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5z',
  save: 'M5 3h11l3 3v15H5zM8 3v6h7V3M8 14h8v7H8z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  refresh: 'M20 12a8 8 0 11-2.3-5.6M20 4v5h-5',
  logout: 'M15 17l5-5-5-5M20 12H9M12 4H6a2 2 0 00-2 2v12a2 2 0 002 2h6',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 117 0v3',
  eye: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6zM12 15a3 3 0 100-6 3 3 0 000 6z',
  // The crossed-out eye shown while a password is hidden.
  'eye-off':
    'M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M6.6 6.7A16.5 16.5 0 002 12s3.6 6 10 6a9.7 9.7 0 004.1-.9M9.9 5.2A9.6 9.6 0 0112 5c6.4 0 10 7 10 7a17.4 17.4 0 01-3.4 4.1',
  'log-in': 'M10 17l5-5-5-5M15 12H3M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4',

  // --- Content / sections ---
  home: 'M4 11l8-6.5 8 6.5V20a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-9z',
  calendar: 'M4 6h16v14H4zM8 3v5M16 3v5M4 11h16',
  image: 'M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 3-3L20 16M15 9.5a1 1 0 100-2 1 1 0 000 2z',
  'file-text': 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  megaphone: 'M4 10v4l12 5V5L4 10zM4 12h3v4H5a1 1 0 01-1-1v-3zM18 9a4 4 0 010 6',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z',
  heart: 'M12 20s-7-4.4-7-9.2A4 4 0 0112 8a4 4 0 017 2.8C19 15.6 12 20 12 20z',
  'heart-handshake': 'M12 20s-7-4.4-7-9.2A4 4 0 0112 8a4 4 0 017 2.8C19 15.6 12 20 12 20zM9 12l3 2 3-2',
  leaf: 'M5 19c0-8 6-13 14-13 0 8-5 14-13 13zM5 19c3-4 6-6 10-7',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM19 19H6',
  briefcase: 'M4 8h16v11H4zM9 8V6a1 1 0 011-1h4a1 1 0 011 1v2M4 13h16',
  activity: 'M3 12h4l2.5-6 4 12 2.5-6h5',
  award: 'M12 15a5 5 0 100-10 5 5 0 000 10zM8.5 14L7 22l5-2.5L17 22l-1.5-8',
  shield: 'M12 3l8 3v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6l8-3zM9 12l2 2 4-4',
  sparkles: 'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  folder: 'M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  settings: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM4 12l-1.2-1.6 1.7-3 2 .3 1.5-1.5-.3-2 3-1.7L12.5 4h1l1.6-1.2 3 1.7-.3 2 1.5 1.5 2-.3 1.7 3L20 12l1.2 1.6-1.7 3-2-.3-1.5 1.5.3 2-3 1.7L12.5 20h-1l-1.6 1.2-3-1.7.3-2L5.7 16l-2 .3-1.7-3L4 12z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M4 6h16M4 12h16M4 18h16',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  bell: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0',
  check: 'M5 13l4 4L19 7',
  'check-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12.5l2.5 2.5 4.5-5',
  alert: 'M12 4l9 16H3l9-16zM12 10v5M12 18h.01',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
  'external-link': 'M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  link: 'M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1',
  star: 'M12 4l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.8-5 2.8 1-5.6-4-3.9 5.5-.8L12 4z',
  quote: 'M9 7H5v5h4c0 3-1.5 4.5-4 5M19 7h-4v5h4c0 3-1.5 4.5-4 5',
  droplet: 'M12 3s6 6.4 6 10.5A6 6 0 016 13.5C6 9.4 12 3 12 3z',
  stethoscope: 'M6 3v6a4 4 0 008 0V3M14 15a3.5 3.5 0 107 0v-2M6 3H4M14 3h2',
  'shield-check': 'M12 3l8 3v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6l8-3zM8.5 12l2.5 2.5 4.5-5',
  'trending-up': 'M3 17l6-6 4 4 8-8M15 7h6v6',
  'building': 'M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 9h4a1 1 0 011 1v11M4 21h17M7 8h4M7 12h4M7 16h4',
  banknote: 'M3 7h18v10H3zM12 15a3 3 0 100-6 3 3 0 000 6zM6 10h.01M18 14h.01',
  'qr-code': 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
} as const;

export type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

export function Icon({ name, className = 'h-5 w-5', ...rest }: IconProps) {
  const d = ICON_PATHS[name] ?? ICON_PATHS.info;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Turn an "iconKey" saved in the Admin Panel into a safe icon name.
 * Used by the Beneficiaries section where the administrator picks an icon.
 */
export function iconFromKey(key?: string | null): IconName {
  if (key && key in ICON_PATHS) return key as IconName;
  return 'users';
}

/** Icon names offered in the Admin Panel dropdown for beneficiary categories. */
export const SELECTABLE_ICONS: IconName[] = [
  'users',
  'user',
  'heart',
  'book',
  'stethoscope',
  'leaf',
  'briefcase',
  'shield-check',
  'sparkles',
  'award',
  'building',
  'globe',
];
