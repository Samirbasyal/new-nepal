// ========================================
// DONATE - STEP 2 AND 3
// ========================================
// Address: /donate/start
//
// A thin server shell. The two steps themselves live in
// components/donate/DonationWizard.tsx, because they need to remember what the
// donor typed when they press Back.
//
// A SIGNED-IN DONOR
//   The page reads the donor's own account and hands the wizard their name, email
//   and number, so they do not retype them. Every field is still editable - a
//   gift is sometimes made on behalf of a family member.
//
//   It also means the donation is attached to their account on the server (see
//   /api/donations/draft), so it appears in their history afterwards. A visitor
//   who is not signed in donates exactly as before, with no account at all.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { DonationWizard } from '@/components/donate/DonationWizard';
import { getCurrentDonor } from '@/lib/donor/session';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Donate - choose a cause',
  description:
    'Choose a cause, tell us who you are, then pay by bank transfer or eSewa and send us the receipt.',
};

export default async function DonateStartPage() {
  const donor = await getCurrentDonor();

  // The phone number stored on the account, if there is one. Kept separate from
  // the session cookie - the cookie holds only what is needed to recognise the
  // account.
  let phone: string | undefined;

  if (donor && isDatabaseConfigured()) {
    const account = await prisma.donorAccount
      .findUnique({ where: { id: donor.id }, select: { phone: true } })
      .catch(() => null);

    phone = account?.phone ?? undefined;
  }

  return (
    <>
      <PageHero
        eyebrow="Donate"
        icon="heart"
        title="Make a donation"
        description="Choose what your gift should support, then tell us how to reach you. Nothing is paid on this page."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          {donor ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-card border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm">
              <p className="flex items-center gap-2 text-ink-700">
                <Icon name="user" className="h-4 w-4 text-brand-600" />
                Signed in as <span className="font-semibold text-ink-900">{donor.email}</span> - this
                donation will be saved to your history.
              </p>

              <Link href="/donor/donations" className="text-xs font-semibold text-brand-700 hover:underline">
                My donations
              </Link>
            </div>
          ) : null}

          <DonationWizard
            prefill={donor ? { name: donor.name, email: donor.email, phone } : undefined}
          />

          <div className="mt-10 border-t border-ink-200 pt-5">
            <Link
              href="/donate"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand-700"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
              Back to Donate
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
