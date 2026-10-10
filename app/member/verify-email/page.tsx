// ========================================
// MEMBER PANEL - VERIFY EMAIL PAGE
// ========================================
// Address: /member/verify-email
//
// This page is PUBLIC on purpose: a member whose email is not verified cannot
// sign in, so the page they need must be reachable while signed out.
//
// HOW THEY GET HERE
//   - the link in the verification email (?token=...)
//   - the sign-in page ("Verify email" link)
//   - a redirect from inside the member panel (see lib/auth/guards.ts)
//
// The real work happens in POST /api/auth/verify-email. The form only collects
// the values; every check is done on the server.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/AuthShell';
import { VerifyEmailForm } from '@/components/forms/VerifyEmailForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verify your email address',
  description: 'Confirm the email address used by your member account.',
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; notice?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Verify your email address"
      subtitle="This one step keeps the member records accurate and stops strangers creating accounts."
      footer={
        <>
          Already verified?{' '}
          <Link href="/member/login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {params.notice === 'verify-required' ? (
        <p className="mb-5 rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Your email address has not been verified yet, so the member panel is locked. Verify it
          below and you will be able to sign in.
        </p>
      ) : null}

      <VerifyEmailForm initialToken={params.token} initialEmail={params.email} />
    </AuthShell>
  );
}
