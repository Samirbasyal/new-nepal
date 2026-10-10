// ========================================
// MEMBER PANEL - FORGOT PASSWORD PAGE
// ========================================
// Address: /member/forgot-password
//
// STEP 1 of the reset: type the registered email address and press send.
// The next page is /member/reset-password, where the link or the 6 digit code
// is used to choose a new password.
//
// This page is PUBLIC, because somebody who cannot sign in must still be able
// to recover their account.
// ========================================

import type { Metadata } from 'next';
import { AuthShell } from '@/components/layout/AuthShell';
import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Ask for a link to choose a new password for your member account.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="We will email you a link to choose a new one. It expires after 30 minutes."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
