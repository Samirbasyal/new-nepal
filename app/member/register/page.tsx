// ========================================
// MEMBER REGISTRATION - CLOSED ON PURPOSE
// ========================================
// Address: /member/register
//
// THIS PAGE NO LONGER CREATES ACCOUNTS.
//
// WHY
//   Members must not be able to register themselves. Every account is created by
//   an administrator from  Admin Panel -> Members -> Add member, which is what
//   makes the member list, the monthly contribution records and the district
//   reports trustworthy: each account was entered by a person in the office, and
//   its email address is verified before the member can sign in.
//
// The address /member/register is kept (rather than deleted) so that an old
// bookmark or a shared link does not land on a "page not found" error. Visitors
// who arrive here are pointed at the office and at the sign-in page.
//
// The old self-registration form and API endpoint were removed rather than
// switched off, because unreachable code is code that nobody maintains - and it
// would be one forgotten flag away from opening the door again.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member accounts',
  description: 'Member accounts are created by the organization office.',
  robots: { index: false, follow: false },
};

export default function MemberRegisterPage() {
  return (
    <main className="flex min-h-screen flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo size={38} />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-700"
          >
            <Icon name="home" className="h-4 w-4" />
            Back to website
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-7 sm:p-8">
            <h1 className="font-display text-2xl font-bold text-ink-900">Member accounts</h1>
            <p className="mt-1 text-sm text-ink-600">
              Accounts are created by the organization office, not from the website.
            </p>

            <div className="mt-6 space-y-4">
              <Alert tone="warning" title="Direct registration is not available">
                So that every member record is accurate, the office creates each account by hand.
                Please send your <strong>full name</strong>, <strong>email address</strong> and{' '}
                <strong>phone number</strong>, and we will create your account and email you a link
                to verify it.
              </Alert>

              <div className="flex flex-col gap-2">
                <Link href="/join" className="btn btn-primary w-full">
                  <Icon name="user-plus" className="h-4 w-4" />
                  Send us a request
                </Link>
                <Link href="/contact" className="btn btn-outline w-full">
                  <Icon name="mail" className="h-4 w-4" />
                  Contact the office
                </Link>
                <Link href="/member/login" className="btn btn-outline w-full">
                  I already have an account
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-ink-500">
            {organization.name} · Member area
          </p>
        </div>
      </div>
    </main>
  );
}
