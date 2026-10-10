// ========================================
// MEMBER LOGIN
// This code controls the member sign-in page.
// ========================================
// Address: /member/login
//
// The form is components/forms/LoginForm.tsx with mode="member".
//
// This page is PUBLIC (it must be, otherwise nobody could sign in). It is
// deliberately not part of the (site) folder, so it draws its own simple
// navbar and footer from the shared components.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/forms/LoginForm';
import { Logo } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member sign in',
  description: 'Sign in to the member panel of Janakalyan Samataa Yuwa Club.',
  robots: { index: false, follow: true },
};

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col bg-ink-50">
      {/* ---------- Simple header ---------- */}
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo size={38} />
          <Link href="/" className="text-sm font-medium text-ink-600 hover:text-brand-700">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="home" className="h-4 w-4" />
              Back to website
            </span>
          </Link>
        </div>
      </header>

      {/* ---------- The form ---------- */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-7 sm:p-8">
            <h1 className="font-display text-2xl font-bold text-ink-900">Member sign in</h1>
            <p className="mt-1 text-sm text-ink-600">
              Sign in to view notices, programs, events and your tasks.
            </p>

            <div className="mt-6">
              <LoginForm
                mode="member"
                redirectTo={params.next?.startsWith('/member') ? params.next : '/member/dashboard'}
                notice={params.notice}
              />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-ink-500">
            {organization.name} · Member area
          </p>
        </div>
      </div>
    </main>
  );
}
