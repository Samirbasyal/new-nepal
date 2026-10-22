// ========================================
// DONOR - CHOOSE A NEW PASSWORD
// ========================================
// Address: /donor/reset-password?token=...
//
// The token is checked here BEFORE the form is drawn: an expired or already-used
// link shows an explanation and a way to ask for another one, instead of a form
// that would fail when submitted.
//
// The check is read-only. The token is only spent when the new password is
// actually saved, so a mistyped password does not burn the link.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { AuthShell } from '@/components/layout/AuthShell';
import { DonorResetForm } from '@/components/donor/DonorResetForm';
import { isResetTokenUsable } from '@/lib/donor/tokens';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

export default async function DonorResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const raw = (token ?? '').trim();
  const usable = raw !== '' && (await isResetTokenUsable(raw));

  return (
    <>
      <AuthShell
      title="Choose a new password"
      subtitle="Pick something you have not used before. You will sign in with it from now on."
      note="Donor account"
    >

        <div className="mx-auto max-w-lg">
          {!usable ? (
            <div className="card p-6">
              <Alert tone="warning">
                This reset link is not valid any more. It may have expired after one hour, or it may
                already have been used. Links only work once.
              </Alert>

              <div className="mt-5">
                <Link href="/donor/forgot-password" className="btn btn-primary">
                  <Icon name="mail" className="h-4 w-4" />
                  Ask for a new link
                </Link>
              </div>

              <p className="mt-4 text-xs text-ink-500">
                If you did not ask for a reset, nothing has changed - your current password still works.
              </p>
            </div>
          ) : (
            <>
              <div className="card p-6">
                <DonorResetForm token={raw} />
              </div>

              <p className="mt-4 text-center text-xs text-ink-500">
                Choosing a new password signs out any other device that was still using the old one.
              </p>
            </>
          )}

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
      </AuthShell>
    </>
  );
}
