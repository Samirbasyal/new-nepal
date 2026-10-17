// ========================================
// DONOR - CREATE AN ACCOUNT
// ========================================
// Address: /donor/register
//
// ONE JOB: THE FORM
//   The page is deliberately just the form and nothing else. Long explanations
//   beside a sign-up box are read by nobody, and they pushed the fields below the
//   fold on a phone. What a donor account is (and is not) is answered where it
//   matters: on the sign-in page, and by the account itself once they are in.
//
// WHAT IT GIVES THE DONOR
//   A username (their email address) and a password, so they can sign in later
//   and see every donation they made from then on.
//
// WHAT IT DOES NOT GIVE
//   No access to the member panel, the fund, the loans or the admin panel. A
//   donor account is a receipt book, not a membership.
//
// WHY NO EMAIL CONFIRMATION STEP HERE
//   The site sends mail only when SMTP has been configured (lib/email/mailer).
//   Promising "check your inbox" on a site that cannot send mail would lock
//   people out of an account they just created. The account therefore works
//   immediately when no mail server exists, and asks for a six-digit code when
//   one does.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { DonorAuthForm } from '@/components/donor/DonorAuthForm';
import { getCurrentDonor } from '@/lib/donor/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create a donor account',
  robots: { index: false, follow: false },
};

export default async function DonorRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = next && next.startsWith('/') ? next : '/donor/dashboard';

  const donor = await getCurrentDonor();
  if (donor) {
    redirect(donor.emailVerified ? destination : `/donor/verify-email?email=${encodeURIComponent(donor.email)}`);
  }

  return (
    <>
      <PageHero
        eyebrow="Donor account"
        icon="user-plus"
        title="Create your donor account"
        description="One email address, one password, and your giving record is always a sign-in away."
      />

      <Section>
        <div className="mx-auto max-w-lg">
          <div className="card p-6">
            <DonorAuthForm mode="register" next={next} />
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-lg">
          <Link
            href="/donate"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand-700"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Back to Donate
          </Link>
        </div>
      </Section>
    </>
  );
}
