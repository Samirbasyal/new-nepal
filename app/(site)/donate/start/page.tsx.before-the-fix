// ========================================
// DONATE - STEP 2 AND 3
// ========================================
// Address: /donate/start
//
// A thin server shell. The two steps themselves live in
// components/donate/DonationWizard.tsx, because they need to remember what the
// donor typed when they press Back.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { DonationWizard } from '@/components/donate/DonationWizard';

export const metadata: Metadata = {
  title: 'Donate - choose a cause',
  description:
    'Choose a cause, tell us who you are, then pay by bank transfer or eSewa and send us the receipt.',
};

export default function DonateStartPage() {
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
          <DonationWizard />

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
