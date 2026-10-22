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
import Link from 'next/link';
import { LoginForm } from '@/components/forms/LoginForm';
import { LogoMark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { organization } from '@/config/site';
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

  return (
    <main className="flex min-h-screen flex-col bg-brand-900">
      {/* ---------- Simple dark header ---------- */}
      <header className="border-b border-white/10">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={36} onDark />
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">Administration</p>
              <p className="text-xs text-brand-200">{organization.name}</p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-100 hover:text-white"
          >
            <Icon name="home" className="h-4 w-4" />
            Back to website
          </Link>
        </div>
      </header>

      {/* ---------- The form ---------- */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-7 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-brand-50 text-brand-700">
                <Icon name="shield-check" className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-display text-xl font-bold text-ink-900">Administrator sign in</h1>
                <p className="text-xs text-ink-500">Restricted area</p>
              </div>
            </div>

            <LoginForm mode="admin" redirectTo={redirectTo} notice={query.notice} />
          </div>

          {/* ---------- Security note ---------- */}
          <div className="mt-6 rounded-card border border-white/15 bg-white/5 p-4 text-xs leading-relaxed text-brand-100">
            <p className="font-semibold text-white">Protected area</p>
            <p className="mt-1">
              This page is for authorized administrators only. Passwords are stored as secure hashes
              and never in plain text. Every sign-in attempt is recorded, repeated failures are
              temporarily blocked, and an administrator who has turned on two-step verification is
              asked for a code as well.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
