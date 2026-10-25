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
import { DonorAuthFrame } from '@/components/donor/DonorAuthFrame';
import { DonorForgotCodeForm } from '@/components/donor/DonorForgotCodeForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forgot your password',
  robots: { index: false, follow: false },
};

export default function DonorForgotPasswordPage() {
  return (
    <>
      <DonorAuthFrame
      title="Forgot your password?"
      subtitle="Enter the email address you registered with and we will send you a code to choose a new one."
      footer={
        <Link href="/donor/login" className="inline-flex items-center gap-1.5 font-semibold">
          <Icon name="chevron-left" className="h-4 w-4" />
          Back to sign in
        </Link>
      }
    >

        <div className="mx-auto max-w-lg">
            <DonorForgotCodeForm />

          <p className="mt-4 text-center text-xs text-purple-100/60">
            The code works once and expires in one hour. Your password is never sent by email - you
            choose a new one on the website.
          </p>
        </div>
      </DonorAuthFrame>
    </>
  );
}
