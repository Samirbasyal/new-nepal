// ========================================
// MEMBER PORTAL (PUBLIC)
// ========================================
// Address: /member/portal        (the "Register" tab is ?tab=register)
//
// This is the ONE public door into membership. It replaces the old separate
// sign-in page and the old "registration is closed" page, which have both been
// turned into forwards to this address so old links keep working.
//
// WHY IT IS PUBLIC
//   Obviously nobody can sign in before they have an account, and nobody can ask
//   to join before they have a membership. Everything that needs a session lives
//   behind /member/(panel), which the guards protect on the server.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { MemberPortal } from '@/components/member/MemberPortal';
import { Logo } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member portal',
  description:
    'Request membership of Janakalyan Samataa Yuwa Club, or sign in to the member panel.',
  robots: { index: true, follow: true },
};

export default async function MemberPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; notice?: string; next?: string }>;
}) {
  const params = await searchParams;

  // The tab is decided on the server so the very first paint is already correct:
  // no flicker from "login" to "register" while JavaScript loads.
  const requested = (params.tab ?? '').toLowerCase();
  const initialTab = requested === 'register' || requested === 'join' ? 'register' : 'login';

  return (
    <main className="flex min-h-screen flex-col bg-ink-50">
      {/* ---------- Simple header ---------- */}
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo size={38} />
          <Link href="/" className="text-sm font-medium text-ink-600 hover:text-brand-700">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="home" className="h-4 w-4" />
              Back to website
            </span>
          </Link>
        </div>
      </header>

      {/* ---------- What this page is for ---------- */}
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50 to-ink-50">
        <div className="container-page max-w-3xl py-10 text-center sm:py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
            <Icon name="users" className="h-3.5 w-3.5" />
            Member portal
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            Join {organization.name}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
            Send a membership request, or sign in if your account has already been approved and
            activated.
          </p>
        </div>
      </section>

      {/* ---------- The two tabs ---------- */}
      <div className="flex flex-1 justify-center px-4 py-8 sm:py-10">
        <div className="w-full max-w-2xl">
          <div className="card p-6 sm:p-8">
            <MemberPortal
              initialTab={initialTab}
              notice={params.notice}
              next={params.next}
            />
          </div>

          {/* ---------- Reassurance in plain words ---------- */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-ink-200 bg-white p-4">
              <Icon name="shield-check" className="h-5 w-5 text-brand-600" />
              <p className="mt-2 text-xs font-semibold text-ink-900">Approved by the committee</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                No account is created automatically. A person reviews every request.
              </p>
            </div>

            <div className="rounded-card border border-ink-200 bg-white p-4">
              <Icon name="lock" className="h-5 w-5 text-brand-600" />
              <p className="mt-2 text-xs font-semibold text-ink-900">You choose your password</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                It is set from a private link and stored only as a hash. Nobody can read it.
              </p>
            </div>

            <div className="rounded-card border border-ink-200 bg-white p-4">
              <Icon name="mail" className="h-5 w-5 text-brand-600" />
              <p className="mt-2 text-xs font-semibold text-ink-900">Use an address you can open</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                The approval and activation link is sent there, so a typed address is wasted.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-ink-500">
            {organization.name} · Member area ·{' '}
            <Link href="/contact" className="font-medium text-ink-600 hover:underline">
              Contact the office
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
