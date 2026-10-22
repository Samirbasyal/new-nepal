// ========================================
// ADMIN SIGN-IN - THE PRIVATE ADDRESS
// ========================================
// Address: /admin/<ADMIN_LOGIN_SLUG>       (default: office-entry-7k2q)
//
// The path is no longer /admin/login. It is not linked from the homepage, the
// navigation bar, the footer, the mobile menu, the member portal or any other
// public page - by design. Only an administrator who has been told the address
// can reach this form.
//
// HOW THE ADDRESS IS DECIDED
//   ADMIN_LOGIN_SLUG in the environment, defaulted and sanitised in
//   lib/auth/admin-entry.ts. Change it there (one variable), not here.
//
// EVERY OTHER /admin/<something> ADDRESS
//   `notFound()` - a 404 page, exactly as if the URL did not exist. That matters:
//   /admin/login must not answer with a helpful "this is the login page" hint,
//   and neither should /admin/administrator, /admin/wp-admin or anything else a
//   scanner tries.
//
// WHAT PROTECTS THE PANEL
//   Not this page, and not the secret address. The protection is:
//     - middleware.ts            (no ADMIN session -> back to this form)
//     - lib/auth/guards.ts       (requireAdmin() on every admin page, role read
//                                 from the database every time)
//     - lib/api/guard.ts         (requireAdminApi() on every admin API, plus a
//                                 same-origin check against forged requests)
//
//   The address is deliberately obscure, but it is NOT the lock. If everybody
//   knew it, the panel would still be closed.
// ========================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LoginForm } from '@/components/forms/LoginForm';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_ENTRY_SLUG } from '@/lib/auth/admin-entry';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  // Belt and braces: an address that is not linked anywhere must not be indexed
  // if somebody does stumble on it.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ entry: string }>;
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const [{ entry }, query] = await Promise.all([params, searchParams]);

  // ---------- Any other address under /admin/ ----------
  if (entry !== ADMIN_ENTRY_SLUG) notFound();

  // Only allow redirects back into the admin area - never to another website.
  const redirectTo = query.next && query.next.startsWith('/admin') ? query.next : '/admin/dashboard';

  // ========================================
  // THE SAME FRAME AS EVERY OTHER SIGN-IN PAGE
  // ========================================
  // The administrator form used to sit on its own dark background. It now uses
  // the shared auth frame, so the member portal and this page look like one
  // website - while the address stays private (lib/auth/admin-entry.ts).
  return (
    <AuthFrame note="Administrator sign-in - restricted area">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-brand-50 text-brand-700">
          <Icon name="shield-check" className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">Administrator sign in</h1>
          <p className="text-xs text-ink-500">Restricted to club administrators</p>
        </div>
      </div>

      <LoginForm mode="admin" redirectTo={redirectTo} notice={query.notice} />
    </AuthFrame>
  );
}
