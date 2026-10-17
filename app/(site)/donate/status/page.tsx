// ========================================
// DONATE - LOOK UP A DONATION
// ========================================
// Address: /donate/status
//
// HOW IT WORKS
//   The donor pastes the reference number they were given. If it exists, they are
//   sent to the same page that shows the status, so there is only ONE place that
//   decides how a status is worded - no chance of the two disagreeing.
//
// WHY NO LOGIN IS NEEDED, AND WHY THAT IS STILL SAFE
//   The reference is the donation's own cuid: long, random and unguessable. There
//   is no "donation 1, 2, 3" to walk through, and the page shows only that one
//   donation - never a list, never another donor's details.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Check your donation',
  robots: { index: false, follow: false },
};

export default async function DonateStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const reference = (ref ?? '').trim();

  let notFound = false;

  if (reference !== '' && isDatabaseConfigured()) {
    const donation = await prisma.donation
      .findFirst({
        where: { id: reference, isDeleted: false },
        select: { id: true },
      })
      .catch(() => null);

    if (donation) redirect(`/donate/submitted/${donation.id}`);
    notFound = true;
  }

  return (
    <>
      <PageHero
        eyebrow="Donate"
        icon="search"
        title="Check your donation"
        description="Enter the reference number you received when you submitted your donation."
      />

      <Section>
        <div className="mx-auto max-w-xl">
          <form method="get" action="/donate/status" className="card p-6">
            <label htmlFor="ref" className="block text-sm font-semibold text-ink-900">
              Donation reference number
            </label>

            <input
              id="ref"
              name="ref"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="For example cm3k9x2b10000abcd1234efgh"
              defaultValue={reference}
              className="mt-2 w-full rounded-card border border-ink-300 bg-white px-3 py-2.5 font-mono text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />

            <p className="mt-1.5 text-xs text-ink-500">
              It was shown on the page after you submitted your payment.
            </p>

            <Button type="submit" variant="primary" className="mt-4 w-full">
              <Icon name="search" className="h-4 w-4" />
              Check status
            </Button>
          </form>

          {notFound ? (
            <div className="mt-4">
              <Alert tone="error">
                No donation was found with that reference. Please check it and try again, or contact
                the office and they will find your donation for you.
              </Alert>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/donate"
              className="inline-flex items-center gap-1.5 font-semibold text-ink-600 hover:text-brand-700"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
              Back to Donate
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
            >
              <Icon name="mail" className="h-4 w-4" />
              Lost your reference? Contact the office
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
