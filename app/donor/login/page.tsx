// ========================================
// DONOR - SIGN IN
// ========================================
// Address: /donor/login
//
// WHO THIS IS FOR
//   A person who has given money to the club and wants to see their own record
//   of it: what they gave, for which cause, when, and whether the office has
//   confirmed the payment yet.
//
// IMPORTANT FOR FIRST-TIME VISITORS
//   No account is needed to donate. This page says so, because a sign-in wall in
//   front of a donation form is the quickest way to lose a donor.
//
// ALREADY SIGNED IN?
//   Sent straight to their history - the same courtesy the member area gives.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { DonorAuthForm } from '@/components/donor/DonorAuthForm';
import { DonorAuthFrame } from '@/components/donor/DonorAuthFrame';
import { getCurrentDonor } from '@/lib/donor/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Donor sign in',
  robots: { index: false, follow: false },
};

export default async function DonorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const { notice, next } = await searchParams;

  const destination = next && next.startsWith('/') ? next : '/donor/dashboard';

  const donor = await getCurrentDonor();

  // Already signed in: go where they were heading. An unproven account is sent
  // to the code page instead, because that is the only thing left to do.
  if (donor) {
    redirect(donor.emailVerified ? destination : `/donor/verify-email?email=${encodeURIComponent(donor.email)}`);
  }

  return (
    <DonorAuthFrame
      title="Sign in to see your donations"
      subtitle="Your own record of what you gave, which cause it supported, and whether the office has confirmed the payment."
      footer={
        <span className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/donor/register" className="font-semibold">
            Create a donor account
          </Link>
          <Link href="/donate">Back to Donate</Link>
        </span>
      }
    >
      {notice === 'login-required' ? (
        <div className="mb-4">
          <Alert tone="info">
            Please sign in - or create a donor account - to continue with your donation.
          </Alert>
        </div>
      ) : null}

      {notice === 'password-changed' ? (
        <div className="mb-4">
          <Alert tone="success">Your new password is saved. Please sign in with it.</Alert>
        </div>
      ) : null}

      <DonorAuthForm mode="login" next={next} />
    </DonorAuthFrame>
  );
}
