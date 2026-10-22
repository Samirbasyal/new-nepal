// ========================================
// DISPLAY - THE WAY INTO THE MEMBER AREA
// ========================================
// Address: /display        (reached from  More -> Display)
//
// WHY THIS PAGE EXISTS
//   The navbar used to carry a "Member Login" button, which is a dead end for
//   anybody who is not a member yet - and a promise of something a visitor cannot
//   have. Now the only road in is:
//
//       More  ->  Display  ->  Member view  ->  registration form / sign in
//
//   A visitor first lands here, where the club says welcome and explains what
//   membership actually involves. The "Member view" button in the bottom corner
//   then opens the member portal, which has both the membership request form and
//   the sign-in form.
//
// WHERE THE FORM LIVES
//   NOT on this page. It is the real, server-checked form at /member/portal
//   (components/member/MembershipRequestForm.tsx). This page deliberately does not
//   repeat it: one form, one place, one set of rules.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Welcome to club',
  description:
    'Welcome to Janakalyan Samataa Yuwa Club. Open Member view to request membership or sign in to the member panel.',
};

export default function DisplayPage() {
  return (
    <>
      <PageHero
        eyebrow="Members"
        icon="users"
        title="Welcome to club"
        description={`${organization.name} - a community of people from Bajhang working together for equality, dignity and local development.`}
      />

      <Section>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          {/* ========================================
              WHAT THIS PAGE IS FOR
              ======================================== */}
          <div className="lg:col-span-7">
            <h2 className="font-display text-2xl font-bold text-ink-900">This is the member area</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-600">
              Everything about membership starts here. Use the{' '}
              <strong className="font-semibold text-ink-900">Member view</strong> button in the
              bottom corner of this page: it opens the member portal, where you can either ask to
              become a member or sign in if your account is already active.
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  icon: 'user-plus' as const,
                  title: 'Request membership',
                  text: 'Fill in the form once: your details, why you want to join, and a short letter to the committee. It takes about five minutes.',
                },
                {
                  icon: 'shield-check' as const,
                  title: 'The committee reviews it',
                  text: 'An administrator reads every application. Nothing is approved automatically, and no account is created until they decide.',
                },
                {
                  icon: 'lock' as const,
                  title: 'You choose your own password',
                  text: 'If it is approved, you receive a private link. You set the password yourself - nobody at the club ever sees it - and then you can sign in.',
                },
              ].map((step, index) => (
                <div key={step.title} className="flex gap-4 rounded-card border border-ink-200 bg-white p-5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-50 text-brand-700">
                    <Icon name={step.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">
                      <span className="mr-1.5 text-brand-600">{index + 1}.</span>
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================
              THE SIDE PANEL
              ======================================== */}
          <aside className="lg:col-span-5">
            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">Already a member?</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Sign in to see notices, programmes, events, your monthly fund and your tasks.
                </p>
                <Link href="/member/portal?tab=login" className="btn btn-primary mt-4 w-full">
                  <Icon name="log-in" className="h-4 w-4" />
                  Member view
                </Link>
                <p className="mt-2 text-center text-xs text-ink-500">
                  Sign-in is on the second tab.
                </p>
              </div>

              <div className="card bg-brand-50/60 p-6">
                <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
                  <Icon name="shield-check" className="h-5 w-5 text-brand-600" />
                  Your information stays private
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Applications are stored in the club&apos;s own database and can only be read by a
                  signed-in administrator. They are never shown on the public website.
                </p>
              </div>

              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">Need help?</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  If something does not work, contact the office - a person will answer.
                </p>
                <Link href="/contact" className="btn btn-outline mt-4 w-full">
                  <Icon name="mail" className="h-4 w-4" />
                  Contact the office
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </Section>

      {/* ========================================
          THE CORNER BUTTON
          ======================================== */}
      {/*
        Pinned to the bottom-right corner of the page, as asked: the member sign-in
        (now called "Member view") is the one door into the member portal. It is
        outside the normal page flow so it is reachable without scrolling, and it
        keeps its distance from the footer text on small screens.
      */}
      <Link
        href="/member/portal"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5 transition-colors hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 print:hidden"
      >
        <Icon name="users" className="h-4 w-4" />
        Member view
      </Link>
    </>
  );
}
