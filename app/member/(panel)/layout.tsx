// ========================================
// MEMBER PANEL
// This code controls the Member Dashboard layout.
// ========================================
// Everything inside app/member/(panel)/ is the private member area.
// The brackets around "(panel)" are a Next.js route group: they organise the
// files WITHOUT changing the address. So app/member/(panel)/dashboard/page.tsx
// is simply  /member/dashboard
//
// THIS LAYOUT
//   1. asks the server "is somebody signed in?"  -> requireMember()
//   2. shows the member menu and the panel header
//
// If the visitor is not signed in, requireMember() redirects them to
// /member/login before any of this is rendered. That check happens on the
// SERVER, so it cannot be bypassed from the browser.
// ========================================

import Link from 'next/link';
import { requireMember } from '@/lib/auth/guards';
import { MemberNav } from '@/components/member/MemberNav';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { LogoMark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export default async function MemberPanelLayout({ children }: { children: React.ReactNode }) {
  // ---------- SERVER-SIDE AUTHORIZATION ----------
  // Not signed in? -> redirected to /member/login
  const user = await requireMember();

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* ========================================
          PANEL HEADER
          ======================================== */}
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-brand-600 to-accent-500" />

        <Container className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoMark size={34} />
            <div className="leading-tight">
              <p className="text-sm font-bold text-ink-900">Member Panel</p>
              <p className="hidden text-xs text-ink-500 sm:block">{organization.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-btn px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 sm:inline-flex"
            >
              <Icon name="home" className="h-4 w-4" />
              Website
            </Link>

            <LogoutButton className="rounded-btn border border-ink-300 px-3 py-2 text-sm font-medium text-ink-700 hover:border-red-300 hover:text-red-600" />
          </div>
        </Container>
      </header>

      {/* ========================================
          PANEL BODY
          ======================================== */}
      <div className="flex-1">
        <Container className="py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Menu (sidebar on desktop, button row on mobile) */}
            <div className="lg:col-span-3">
              <MemberNav memberName={user.name} />
            </div>

            {/* Page content */}
            <div className="min-w-0 lg:col-span-9">{children}</div>
          </div>
        </Container>
      </div>

      <footer className="border-t border-ink-200 bg-white py-5">
        <Container className="text-center text-xs text-ink-500">
          {organization.name} · Member area · Signed in as {user.name}
        </Container>
      </footer>
    </div>
  );
}
