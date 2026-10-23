// ========================================
// NEPALI (Bikram Sambat) DATES
// ========================================
// The club works in Bikram Sambat, but a database stores Gregorian dates. This
// file is the ONE place that turns one into the other, so every screen shows the
// same wording: "15 Baisakh 2082".
//
// WHY A LIBRARY
//   Converting to BS needs the real month lengths of every year (they are not
//   fixed - a month is 29 to 32 days). nepali-date-converter carries that table,
//   which is far safer than a hand-written one.
//
// SAFETY
//   Everything is wrapped: an unknown or broken date returns null and the caller
//   simply shows the English date only. A bad date must never break a page.
// ========================================

import NepaliDate from 'nepali-date-converter';

const MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

export type NepaliDateText = {
  /** "15 Baisakh 2082" */
  full: string;
  /** "Baisakh 2082" */
  month: string;
  /** "2082-01-15" */
  iso: string;
};

/** Convert a Gregorian date to Bikram Sambat text. Returns null if it cannot. */
export function toNepaliDate(value: Date | string | null | undefined): NepaliDateText | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const bs = new NepaliDate(date);
    const year = bs.getYear();
    const monthIndex = bs.getMonth();
    const day = bs.getDate();
    const monthName = MONTHS_EN[monthIndex] ?? '';
    if (!monthName) return null;

    return {
      full: `${day} ${monthName} ${year}`,
      month: `${monthName} ${year}`,
      iso: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
  } catch {
    return null;
  }
}

/** "15 Baisakh 2082" or '' - for use straight inside JSX. */
export function nepaliDate(value: Date | string | null | undefined): string {
  return toNepaliDate(value)?.full ?? '';
}

/**
 * "22 Oct 2026 &middot; 5 Kartik 2082" - the English date first (the database's own
 * date), then the Bikram Sambat one. If the conversion fails only the English
 * date is shown, never an empty line.
 */
export function withNepaliDate(value: Date | string | null | undefined): string {
  const english = value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const nepali = nepaliDate(value);
  if (!nepali) return english;
  return english ? `${english} - ${nepali}` : nepali;
}
