// ========================================
// SHARED HELPER FUNCTIONS
// ========================================
// Small reusable functions used all over the website.
// Keeping them here avoids writing the same code in many places.
// ========================================

import clsx, { type ClassValue } from 'clsx';

/**
 * Join CSS class names together and drop empty ones.
 * Example: cn('p-4', isActive && 'bg-brand-600') -> "p-4 bg-brand-600"
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ========================================
// TEXT HELPERS
// ========================================

/**
 * Turn a title into a URL friendly address.
 * Example: "Women Empowerment Program!" -> "women-empowerment-program"
 * Used for the "slug" column so pages like /programs/women-empowerment-program work.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Make a slug that is very unlikely to already exist.
 * Example: "annual-program" -> "annual-program-k3f9x2"
 */
export function slugifyUnique(value: string): string {
  const base = slugify(value) || 'item';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/** Shorten long text for previews ("read more" cards). */
export function truncate(value: string, max = 160): string {
  const clean = (value ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

/**
 * Turn a multi-line textarea value into a list.
 * The Admin Panel uses this for "one objective per line" fields.
 * Example: "A\nB\n" -> ["A", "B"]
 */
export function parseLines(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

// ========================================
// DATE HELPERS
// ========================================

/** Format a date like "12 March 2026". Empty dates return an empty string. */
export function formatDate(value?: Date | string | null): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format a short date like "12 Mar 2026" (used in tables). */
export function formatDateShort(value?: Date | string | null): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format date + time like "12 March 2026, 2:30 PM" (used for events). */
export function formatDateTime(value?: Date | string | null): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDate(date)}, ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * Value for an <input type="date"> field.
 * The browser needs the format YYYY-MM-DD.
 */
export function toDateInputValue(value?: Date | string | null): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** Value for an <input type="datetime-local"> field. */
export function toDateTimeInputValue(value?: Date | string | null): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Is this date in the future? (used to show "Upcoming" badges) */
export function isUpcoming(value?: Date | string | null): boolean {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.getTime() > Date.now();
}

// ========================================
// IMAGE HELPERS
// ========================================

/**
 * A safe image source.
 * If the Admin Panel has no image yet we show a neutral placeholder from
 * the public folder instead of a broken image icon.
 */
export const FALLBACK_IMAGE = '/branding/image-placeholder.svg';

export function imageSrc(url?: string | null): string {
  const value = (url ?? '').trim();
  if (!value) return FALLBACK_IMAGE;
  return value;
}

/** True when a real image was provided (so we can hide the "no image" note). */
export function hasImage(url?: string | null): boolean {
  return Boolean((url ?? '').trim());
}

// ========================================
// PAGINATION HELPERS
// ========================================

/** Read a page number from the URL search parameters. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Build a page URL that keeps the existing filters. */
export function buildPageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

// ========================================
// FORM HELPERS
// ========================================

/**
 * Read the values of a <form> as a plain object.
 * Works for normal inputs, textareas and checkboxes.
 */
export function formToObject(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  const result: Record<string, string> = {};
  data.forEach((value, key) => {
    result[key] = typeof value === 'string' ? value : '';
  });
  return result;
}

/** Very small e-mail check used for instant form feedback in the browser. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

// ========================================
// NUMBER / CURRENCY HELPERS
// ========================================

/** Format a number with thousands separators: 12500 -> "12,500" */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/** Format money: (12500, 'NPR') -> "NPR 12,500" */
export function formatMoney(amount: number, currency = 'NPR'): string {
  return `${currency} ${formatNumber(amount)}`;
}
