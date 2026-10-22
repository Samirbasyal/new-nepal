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
import { AuthShell } from '@/components/layout/AuthShell';
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
    <AuthShell
      title="Create your donor account"
      subtitle="One email address, one password, and your giving record is always a sign-in away."
      note="Donor account"
      footer={
        <span className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/donor/login" className="font-semibold text-brand-700 hover:underline">
            I already have an account
          </Link>
          <Link href="/donate" className="text-ink-600 hover:text-brand-700">
            Back to Donate
          </Link>
        </span>
      }
    >
      <DonorAuthForm mode="register" next={next} />
    </AuthShell>
  );
}
