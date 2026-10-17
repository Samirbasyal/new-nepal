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
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { DonorAuthForm } from '@/components/donor/DonorAuthForm';
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

  const donor = await getCurrentDonor();
  if (donor) redirect('/donor/donations');

  return (
    <>
      <PageHero
        eyebrow="Donor account"
        icon="user"
        title="Sign in to see your donations"
        description="Your own record of what you gave, which cause it supported, and whether the office has confirmed the payment."
      />

      <Section>
        <div className="mx-auto max-w-lg">
          {notice === 'login-required' ? (
            <div className="mb-4">
              <Alert tone="info">Please sign in to see your donation history.</Alert>
            </div>
          ) : null}

          <div className="card p-6">
            <DonorAuthForm mode="login" next={next} />
          </div>

          <div className="mt-6 rounded-card border border-ink-200 bg-ink-50/60 p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-600">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
              <span>
                You do not need an account to donate, and giving money never requires one. An account is
                only for looking back at your own history.
              </span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              href="/donate"
              className="inline-flex items-center gap-1.5 font-semibold text-ink-600 hover:text-brand-700"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
              Back to Donate
            </Link>

            <Link
              href="/donate/status"
              className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
            >
              <Icon name="search" className="h-4 w-4" />
              Check one donation with its reference
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
