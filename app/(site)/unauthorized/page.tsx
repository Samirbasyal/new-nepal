// ========================================
// UNAUTHORIZED PAGE
// This code controls the "You are not authorized" page.
// ========================================
// WHEN IT IS SHOWN
//   A signed-in member who tries to open an ADMIN page (or an admin API) is
//   sent here by lib/auth/guards.ts or middleware.ts.
//
// WHY IT EXISTS
//   The Admin Panel is protected by the SERVER, not by hiding a menu link.
//   When a normal member types /admin/dashboard into the address bar, the
//   server refuses and this page explains why.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Section';
import { getCurrentUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Not authorized',
  robots: { index: false, follow: false },
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const isAdminOnly = params.reason === 'admin-only';

  // We only use this to show a helpful message. The real protection already
  // happened on the server before this page was even allowed to load.
  const user = await getCurrentUser();

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
          <Icon name="lock" className="h-7 w-7" />
        </span>

        <h1 className="mt-6 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          You are not authorized to access this page
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          {isAdminOnly
            ? 'The page you tried to open is reserved for administrators. Your account is a normal member account, so access was refused.'
            : 'Your account does not have permission to open this page.'}
        </p>

        {/* ---------- Who is signed in right now ---------- */}
        {user ? (
          <div className="mt-6 rounded-card border border-ink-200 bg-ink-50 p-4 text-left text-sm">
            <p className="font-semibold text-ink-800">Signed in as</p>
            <p className="mt-1 text-ink-700">{user.name}</p>
            <p className="text-xs text-ink-500">{user.email}</p>
            <p className="mt-2 text-xs text-ink-500">
              Role: {user.role === 'ADMIN' ? 'Administrator' : 'Member'}
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-500">
            You are not signed in at the moment.
          </p>
        )}

        {/* ---------- What to do next ---------- */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/member/dashboard" variant="primary">
            <Icon name="grid" className="h-4 w-4" />
            Go to my member panel
          </ButtonLink>

          <ButtonLink href="/" variant="outline">
            <Icon name="home" className="h-4 w-4" />
            Back to home
          </ButtonLink>
        </div>

        <p className="mt-8 text-xs text-ink-500">
          Believe this is a mistake?{' '}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            Contact the organization office
          </Link>{' '}
          and an administrator can review your role.
        </p>
      </div>
    </Container>
  );
}
