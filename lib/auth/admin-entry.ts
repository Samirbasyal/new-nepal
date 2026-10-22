// ========================================
// ADMIN ENTRY POINT (THE PRIVATE SIGN-IN ADDRESS)
// ========================================
// The administrator sign-in page no longer sits at /admin/login. It sits at an
// address that appears NOWHERE on the public website: no footer link, no menu
// item, no "Administration" link, no mention in any public page.
//
// WHERE THE ADDRESS COMES FROM
//   ADMIN_LOGIN_SLUG in the environment (Vercel -> Settings -> Environment
//   Variables). If it is not set, the built-in default below is used, so the
//   project works the moment it is deployed.
//
//     /admin/<ADMIN_LOGIN_SLUG>          e.g. /admin/office-entry-7k2q
//
// WHY THIS FILE IS SEPARATE
//   Three very different places have to agree on the same address:
//     - middleware.ts        (redirects people there, and lets it through)
//     - lib/auth/guards.ts   (requireAdmin sends signed-out visitors there)
//     - app/admin/[entry]    (the page itself checks the slug)
//   One module means they cannot disagree.
//
// ========================================
// THIS IS OBSCURITY, NOT SECURITY - AND WE DO NOT PRETEND OTHERWISE
// ========================================
// A hard-to-guess address is a small, real benefit: it keeps scanners and casual
// visitors from finding a password form to attack, and it stops the login page
// appearing in searches or in other people's screenshots.
//
//   It is NOT what protects the Admin Panel. If the whole world knew this
//   address, nothing would change, because:
//     - the password still has to be correct,
//     - the role is re-read from the database on every request,
//     - every admin page and admin API re-checks that role on the server.
//
// So: never treat "nobody knows the URL" as a reason to skip a real check.
//
// SERVER ONLY
//   This module must never be imported by a client component. If it were, the
//   slug would be shipped to the browser in the JavaScript bundle - exactly the
//   thing this is trying to avoid.
// ========================================

/** Fallback used when ADMIN_LOGIN_SLUG is not set. */
const DEFAULT_SLUG = 'office-entry-7k2q';

/**
 * The last part of the private address.
 *
 * Only lower-case letters, digits and dashes are allowed, so an odd environment
 * value can never produce a broken or surprising route.
 */
export const ADMIN_ENTRY_SLUG: string = (() => {
  const raw = (process.env.ADMIN_LOGIN_SLUG ?? DEFAULT_SLUG).trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9-]/g, '');

  // A slug of one or two characters would be trivially guessable, and an empty
  // one would break every redirect - fall back to the default in both cases.
  return cleaned.length >= 6 ? cleaned : DEFAULT_SLUG;
})();

/** The full private address, for example "/admin/office-entry-7k2q". */
export const ADMIN_LOGIN_PATH = `/admin/${ADMIN_ENTRY_SLUG}`;

/**
 * Is this address the private sign-in page?
 *
 * Exactly one path segment, and it has to match. "/admin/office-entry-7k2q/extra"
 * is not the login page, so it is treated like any other protected admin page.
 */
export function isAdminLoginPath(pathname: string): boolean {
  return pathname === ADMIN_LOGIN_PATH || pathname === `${ADMIN_LOGIN_PATH}/`;
}

/**
 * Build the sign-in address with a way back.
 *
 * Used when somebody with no session asks for an admin page: they land on the
 * private sign-in page, and after signing in they continue to the page they
 * originally wanted.
 */
export function adminLoginUrl(params: { notice?: string; next?: string } = {}): string {
  const query = new URLSearchParams();

  if (params.notice) query.set('notice', params.notice);

  // Only ever redirect back inside the admin area - never to another website.
  if (params.next && params.next.startsWith('/admin')) query.set('next', params.next);

  const queryString = query.toString();
  return queryString ? `${ADMIN_LOGIN_PATH}?${queryString}` : ADMIN_LOGIN_PATH;
}
