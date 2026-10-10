// ========================================
// AUTH SHELL - THE FRAME AROUND SIGN-IN TYPE PAGES
// ========================================
// Used by the three member pages that live OUTSIDE the member panel:
//     /member/verify-email
//     /member/forgot-password
//     /member/reset-password
//
// A member who has forgotten their password (or has not verified their email
// yet) cannot sign in, so these pages must be reachable while signed out. They
// therefore draw their own simple header instead of the member panel menu.
//
// WHY A SHARED COMPONENT?
//   So the three pages stay identical in look, and a change to the frame is
//   made once. The existing /member/login page keeps its own markup - working
//   pages are not touched without a reason.
// ========================================

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { organization } from '@/config/site';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Small print under the card (for example "back to sign in"). */
  footer?: ReactNode;
}) {
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

      {/* ---------- The card ---------- */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-7 sm:p-8">
            <h1 className="font-display text-2xl font-bold text-ink-900">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-ink-600">{subtitle}</p> : null}

            <div className="mt-6">{children}</div>
          </div>

          {footer ? <div className="mt-5 text-center text-sm text-ink-600">{footer}</div> : null}

          <p className="mt-6 text-center text-xs text-ink-500">
            {organization.name} · Member area
          </p>
        </div>
      </div>
    </main>
  );
}
