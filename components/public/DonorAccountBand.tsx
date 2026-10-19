// ========================================
// DONOR ACCOUNT - HOME PAGE SECTION
// ========================================
// The missing doorway on the home page.
//
// Before this, a donor who had lost their password had to guess the address
// /donor/forgot-password, because the home page only offered the general
// "Donate" button. Every entry point is now on the page, in one place:
//
//   Sign in            -> /donor/login
//   Create an account  -> /donor/register
//   Forgot password    -> /donor/forgot-password   (visible link, not hidden)
//   Confirm my email   -> /donor/verify-email
//
// Nothing here reveals whether an address has an account - that decision is made
// on the server in app/api/donor/forgot-password/route.ts.
// ========================================

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';

const ACTIONS = [
  {
    label: 'Sign in to your donor account',
    href: '/donor/login',
    icon: 'log-in' as const,
    primary: true,
  },
  {
    label: 'Create a donor account',
    href: '/donor/register',
    icon: 'user-plus' as const,
    primary: false,
  },
  {
    label: 'Forgot your password?',
    href: '/donor/forgot-password',
    icon: 'lock' as const,
    primary: false,
  },
  {
    label: 'Confirm your email address',
    href: '/donor/verify-email',
    icon: 'mail' as const,
    primary: false,
  },
];

export function DonorAccountBand() {
  return (
    <section id="donor-account" className="scroll-mt-24 border-y border-ink-200 bg-white">
      <Container className="py-12 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* ---------- explanation ---------- */}
          <div className="lg:col-span-6">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Donor account</p>

            <h2 className="mt-2 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
              Give once, or follow your giving
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              A donor account is free and takes a minute. It keeps your donations and their
              verification status in one place, and shows you the total you have given to the club.
              It gives no access to the member or administrator panel.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Lost your password? Use <strong>Forgot your password?</strong> below and we will email
              you a secure link to choose a new one. If your email address has not been confirmed
              yet, use <strong>Confirm your email address</strong> to type the six-digit code we
              sent you.
            </p>
          </div>

          {/* ---------- the four doors ---------- */}
          <div className="lg:col-span-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={
                    action.primary
                      ? 'flex items-center gap-3 rounded-card bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700'
                      : 'flex items-center gap-3 rounded-card border border-ink-200 bg-white px-4 py-3.5 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50'
                  }
                >
                  <Icon name={action.icon} className="h-4 w-4 shrink-0" />
                  {action.label}
                </Link>
              ))}
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-ink-500">
              <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              For your safety we never say whether an email address is registered. If you do not
              receive a message within a few minutes, check your spam folder or contact the office.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
