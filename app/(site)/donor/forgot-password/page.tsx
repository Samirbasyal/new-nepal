// ========================================
// DONOR - FORGOT PASSWORD
// ========================================
// Address: /donor/forgot-password
//
// A donor who cannot remember the password that goes with their email address
// lands here from the sign-in page. The reply never says whether the address is
// registered - see the API route for why.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { DonorForgotCodeForm } from '@/components/donor/DonorForgotCodeForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forgot your password',
  robots: { index: false, follow: false },
};

export default function DonorForgotPasswordPage() {
  return (
    <>
      <PageHero
        eyebrow="Donor account"
        icon="mail"
        title="Forgot your password?"
        description="Enter the email address you registered with and we will send you a link to choose a new one."
      />

      <Section>
        <div className="mx-auto max-w-lg">
          <div className="card p-6">
            <DonorForgotCodeForm />
          </div>

          <p className="mt-4 text-center text-xs text-ink-500">
            The link works once and expires in one hour. Your password is never sent by email - you
            choose a new one on the website.
          </p>

          <div className="mt-6 text-sm">
            <Link
              href="/donor/login"
              className="inline-flex items-center gap-1.5 font-semibold text-ink-600 hover:text-brand-700"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
