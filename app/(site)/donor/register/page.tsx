// ========================================
// DONOR - CREATE AN ACCOUNT
// ========================================
// Address: /donor/register
//
// WHAT IT GIVES THE DONOR
//   A username (their email address) and a password, so they can sign in later
//   and see every donation they made from then on.
//
// WHAT IT DOES NOT GIVE
//   No access to the member panel, the fund, the loans or the admin panel. A
//   donor account is a receipt book, not a membership.
//
// WHY NO EMAIL CONFIRMATION STEP
//   The website sends mail only when SMTP has been configured (lib/email/mailer).
//   Promising "check your inbox" on a site that cannot send mail would lock
//   people out of an account they just created. The account therefore works
//   immediately, and it holds no information that somebody who knows only the
//   email address could use.
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

const POINTS = [
  'See every donation you made from now on, in one place.',
  'Know at a glance which payments the office has confirmed.',
  'Your donation form is filled in for you next time.',
];

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
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="card p-6">
            <DonorAuthForm mode="register" next={next} />
          </div>

          <aside className="space-y-4">
            <div className="card p-5">
              <h2 className="text-sm font-bold text-ink-900">What you get</h2>
              <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
                {POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-bold text-ink-900">What it is not</h2>
              <p className="mt-2 text-xs leading-relaxed text-ink-600">
                A donor account is not a membership. It does not enrol you in the monthly NPR 20 fund,
                it gives no access to member or administrator pages, and it changes nothing about how
                donations are recorded or confirmed.
              </p>
            </div>

            <div className="rounded-card border border-ink-200 bg-ink-50/60 p-4">
              <p className="text-xs leading-relaxed text-ink-600">
                Only donations made while you are signed in are added to your history. An earlier gift
                given without an account stays anonymous - an email typed into a form does not prove who
                owns it - so ask the office to help if you need an old one linked.
              </p>
            </div>
          </aside>
        </div>

        <div className="mx-auto mt-6 max-w-4xl">
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
