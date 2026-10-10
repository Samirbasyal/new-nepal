// ========================================
// MEMBER PANEL - RESET PASSWORD PAGE
// ========================================
// Address: /member/reset-password
//
// STEP 2 of the reset. The link from the email arrives as ?token=...
// A member who did not get the email can type their address and the 6 digit
// code instead.
//
// ON SUCCESS the server stores a new bcrypt hash and increases the session
// counter, so every device that was already signed in is signed out.
// ========================================

import type { Metadata } from 'next';
import { AuthShell } from '@/components/layout/AuthShell';
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Set a new password for your member account.',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use the link from your email, or the 6 digit code, and type the password you want."
    >
      <ResetPasswordForm initialToken={params.token} />
    </AuthShell>
  );
}
