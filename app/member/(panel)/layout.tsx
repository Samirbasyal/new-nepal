// ========================================
// MEMBER PANEL
// This code controls the Member Dashboard layout.
// ========================================
// Everything inside app/member/(panel)/ is the private member area.
// The brackets around "(panel)" are a Next.js route group: they organise the
// files WITHOUT changing the address. So app/member/(panel)/dashboard/page.tsx
// is simply  /member/dashboard
//
// THE SHAPE OF THE SCREEN
//   Laptop / desktop : a dark green menu column on the left, the page on the right
//   Tablet / phone   : a slim bar at the top, the page in the middle, and five
//                      buttons pinned to the bottom where a thumb reaches
//
// THIS LAYOUT
//   1. asks the server "is somebody signed in?"  -> requireMember()
//   2. reads the two badges (unread alerts, payments waiting)
//   3. draws the menu, the top bar and the bottom bar
//
// If the visitor is not signed in, requireMember() redirects them to
// /member/login before any of this is rendered. That check happens on the
// SERVER, so it cannot be bypassed from the browser.
// ========================================

import Link from 'next/link';
import { requireMember } from '@/lib/auth/guards';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { getLanguage } from '@/lib/i18n-server';
import { LangProvider } from '@/components/ui/LangProvider';
import { MemberNav } from '@/components/member/MemberNav';
import { MobileTabBar } from '@/components/member/MobileTabBar';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { LogoMark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export default async function MemberPanelLayout({ children }: { children: React.ReactNode }) {
  // ---------- SERVER-SIDE AUTHORIZATION ----------
  const user = await requireMember();
  const lang = await getLanguage();

  // ---------- the two badges ----------
  // Read on every page of the panel, so they cannot be lost by refreshing, by
  // opening another page, or by signing in again.
  const [pendingPayments, unread] = isDatabaseConfigured()
    ? await Promise.all([
        prisma.fundPayment
          .count({ where: { memberId: user.id, status: 'PENDING' } })
          .catch(() => 0),
        prisma.notification.count({ where: { userId: user.id, readAt: null } }).catch(() => 0),
      ])
    : [0, 0];

  return (
    <div className="min-h-screen bg-ink-50 lg:flex lg:h-dvh lg:overflow-hidden">
      {/* ========================================
          THE MENU COLUMN (desktop)
          ======================================== */}
      <aside className="hidden w-[248px] shrink-0 flex-col bg-[#0b3b2e] lg:flex print:hidden">
        {/* logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4 text-white"
        >
          <LogoMark size={34} onDark />
          <span className="leading-tight">
            <span className="block text-sm font-bold">Member Panel</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-100/60">
              {organization.name}
            </span>
          </span>
        </Link>

        <div className="min-h-0 flex-1">
          <MemberNav
            memberName={user.name}
            lang={lang}
            pendingPayments={pendingPayments}
            unread={unread}
          />
        </div>

        {/* the foot of the column: the same promise as the website */}
        <div className="relative overflow-hidden px-5 pb-5 pt-8">
          <svg
            aria-hidden="true"
            viewBox="0 0 200 90"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-25"
            preserveAspectRatio="none"
          >
            <path d="M0 70 L35 34 L60 58 L90 22 L120 60 L150 36 L200 74 L200 90 L0 90 Z" fill="#ffffff" />
          </svg>
          <p className="relative font-display text-sm italic leading-snug text-emerald-50/70">
            Stronger Youth,
            <br />
            Brighter Future
          </p>
        </div>
      </aside>

      {/* ========================================
          THE PAGE
          ======================================== */}
      <div className="flex min-w-0 flex-1 flex-col lg:h-dvh">
        {/* ---------- top bar ---------- */}
        <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur print:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            {/* on a phone this bar carries the logo instead of the menu */}
            <Link href="/" className="flex items-center gap-2.5 lg:hidden">
              <LogoMark size={30} />
              <span className="leading-tight">
                <span className="block text-[13px] font-bold text-ink-900">Member Panel</span>
                <span className="block text-[10px] text-ink-500">{organization.name}</span>
              </span>
            </Link>

            <p className="hidden text-sm font-semibold text-ink-900 lg:block">
              {organization.name}
            </p>

            <div className="flex items-center gap-1.5">
              <Link
                href="/member/notifications"
                aria-label="Notifications"
                className="relative rounded-full p-2 text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              >
                <Icon name="bell" className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </Link>

              <Link
                href="/member/profile"
                aria-label="My profile"
                className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white ring-2 ring-white"
              >
                {user.name.slice(0, 1).toUpperCase()}
              </Link>

              <LogoutButton className="ml-1 rounded-full border border-ink-300 p-2 text-ink-600 hover:border-red-300 hover:text-red-600" />
            </div>
          </div>
        </header>

        {/* ---------- the page itself ---------- */}
        {/* pb-24 on a phone leaves room for the bottom bar, so the last card is
            never trapped underneath it. */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
            <LangProvider lang={lang}>{children}</LangProvider>
          </div>
        </main>
      </div>

      {/* ========================================
          THE PHONE BAR
          ======================================== */}
      <MobileTabBar unread={unread} pendingPayments={pendingPayments} />
    </div>
  );
}
