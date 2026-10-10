// ========================================
// ADMIN LOGIN
// This code controls the administrator sign-in page.
// ========================================
// Address: /admin/login
//
// HOW ADMINISTRATORS REACH THIS PAGE
//   There is deliberately NO "Admin" link in the public menu. Administrators
//   simply visit /admin/login directly and sign in. A discreet
//   "Administration" link exists in the footer for convenience, but it only
//   opens THIS login page - never the dashboard.
//
// WHAT PROTECTS THE PANEL
//   Not this page, and not hiding links. The protection is:
//     - middleware.ts            (redirects anyone without an ADMIN session)
//     - lib/auth/guards.ts       (requireAdmin() on every admin page)
//     - lib/api/guard.ts         (requireAdminApi() on every admin API)
//
// The form sends portal: "admin", so the server refuses to create a session
// for a normal member here, even if their password is correct.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/forms/LoginForm';
import { LogoMark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administrator sign in',
  // Never allow search engines to index an admin login page.
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const params = await searchParams;

  // Only allow redirects back into the admin area - never to another website.
  const redirectTo =
    params.next && params.next.startsWith('/admin') ? params.next : '/admin/dashboard';

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
                <h1 className="font-display text-xl font-bold text-ink-900">
                  Administrator sign in
                </h1>
                <p className="text-xs text-ink-500">Restricted area</p>
              </div>
            </div>

            <LoginForm mode="admin" redirectTo={redirectTo} notice={params.notice} />
          </div>

          {/* ---------- Security note ---------- */}
          <div className="mt-6 rounded-card border border-white/15 bg-white/5 p-4 text-xs leading-relaxed text-brand-100">
            <p className="font-semibold text-white">Protected area</p>
            <p className="mt-1">
              This page is for authorized administrators only. Passwords are stored as secure hashes
              and never in plain text. Every sign-in attempt is recorded, and repeated failures are
              temporarily blocked.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
