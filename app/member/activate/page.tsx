// ========================================
// MEMBER PORTAL - ACTIVATION LINK
// ========================================
// Address: /member/activate?token=...
//
// This page is the middle of the join-up flow:
//
//   request sent  ->  administrator approves  ->  THIS PAGE  ->  signed in
//
// It is PUBLIC on purpose: the person opening it has an approved application but
// no account yet, so there is nothing for them to sign in with.
//
// EVERY FAILURE IS EXPLAINED
//   An invalid link, an expired link, a used link and a request that has not been
//   approved yet are four different situations and each one gets its own sentence
//   and its own way out. Swallowing them behind "something went wrong" would leave
//   people ringing the office.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/AuthShell';
import { ActivateAccountForm } from '@/components/member/ActivateAccountForm';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { findActivation } from '@/lib/membership/tokens';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Activate your membership',
  description: 'Create the password for an approved membership of Janakalyan Samataa Yuwa Club.',
  robots: { index: false, follow: false },
};

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = (params.token ?? '').trim();

  const lookup = token ? await findActivation(token) : ({ ok: false, reason: 'not-found' } as const);

  if (!lookup.ok) {
    const copy: Record<string, { title: string; text: string }> = {
      expired: {
        title: 'This link has expired',
        text:
          'Activation links stop working after seven days. Ask the office for a new one - they can ' +
          'create it in a moment from the Admin Panel, and the old one will stop working.',
      },
      'already-activated': {
        title: 'This link has already been used',
        text:
          'An account was created with this link, so it cannot be used again. Please sign in with ' +
          'the password you chose. If you have forgotten it, use "Forgot password".',
      },
      'not-approved': {
        title: 'This request has not been approved yet',
        text:
          'Your membership request is still waiting for the committee. You will receive the ' +
          'activation link by email once it has been approved.',
      },
      rejected: {
        title: 'This request was not accepted',
        text:
          'The committee reviewed this application and was not able to accept it, so the activation ' +
          'link cannot be used. Please contact the office if you would like to talk about it.',
      },
      'not-found': {
        title: 'This activation link is not valid',
        text:
          'The link may be incomplete - some email programs break long addresses across two lines. ' +
          'Please copy the whole address from the email, or ask the office for a new link.',
      },
    };

    const chosen = copy[lookup.reason] ?? copy['not-found'];

    return (
      <AuthShell title={chosen.title} subtitle="Membership activation">
        <div className="space-y-4">
          <Alert tone={lookup.reason === 'not-approved' ? 'info' : 'warning'}>{chosen.text}</Alert>

          <div className="flex flex-col gap-2">
            <Link href="/member/portal?tab=login" className="btn btn-primary w-full">
              <Icon name="log-in" className="h-4 w-4" />
              Go to sign in
            </Link>
            <Link href="/contact" className="btn btn-outline w-full">
              <Icon name="mail" className="h-4 w-4" />
              Contact the office
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="One last step: choose the password you will use to sign in."
    >
      <ActivateAccountForm token={token} fullName={lookup.fullName} email={lookup.email} />
    </AuthShell>
  );
}
