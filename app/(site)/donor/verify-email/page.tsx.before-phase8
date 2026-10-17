// ========================================
// DONOR - CONFIRM YOUR EMAIL
// ========================================
// Address: /donor/verify-email?email=...&next=...
//
// WHERE THIS SITS IN THE JOURNEY
//   Donate -> register -> THIS PAGE -> back to the donation form.
//   A donor cannot open the donation form until the code has been typed, so this
//   is the last door before giving money.
//
// IF THERE IS NO MAIL SERVER
//   No code can be sent, so registration activates the account immediately and
//   this page would be a dead end. It says that plainly and offers the way out.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { DonorVerifyForm } from '@/components/donor/DonorVerifyForm';
import { getCurrentDonor } from '@/lib/donor/session';
import { isEmailConfigured } from '@/lib/email/mailer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirm your email',
  robots: { index: false, follow: false },
};

export default async function DonorVerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string; notice?: string }>;
}) {
  const { email, next, notice } = await searchParams;

  const donor = await getCurrentDonor();

  // Already proven and signed in: nothing to do here.
  if (donor?.emailVerified) {
    redirect(next && next.startsWith('/') ? next : '/donor/dashboard');
  }

  const address = (email ?? donor?.email ?? '').trim().toLowerCase();
  if (!address) redirect('/donor/login?notice=login-required');

  const mailReady = isEmailConfigured();

  return (
    <>
      <PageHero
        eyebrow="Donor account"
        icon="mail"
        title="Confirm your email address"
        description="One code, and your donation can begin. This is what keeps your history yours."
      />

      <Section>
        <div className="mx-auto max-w-lg">
          {notice === 'verify-required' ? (
            <div className="mb-4">
              <Alert tone="info">
                Please confirm your email address before donating. It only takes a moment.
              </Alert>
            </div>
          ) : null}

          {!mailReady ? (
            <div className="mb-4">
              <Alert tone="warning">
                This website has no mail server configured, so no code can be sent. If you have just
                registered, your account is already active - please sign in. Otherwise contact the
                office and they will help.
              </Alert>
            </div>
          ) : null}

          <div className="card p-6">
            <DonorVerifyForm email={address} next={next} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              href="/donate"
              className="inline-flex items-center gap-1.5 font-semibold text-ink-600 hover:text-brand-700"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
              Back to Donate
            </Link>

            <Link href="/donor/login" className="font-semibold text-brand-700 hover:underline">
              Go to sign in
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
