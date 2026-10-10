// ========================================
// ADMIN PANEL
// This code controls the Admin Dashboard layout.
// ========================================
// Everything inside app/admin/(panel)/ is the private administrator area.
// The brackets around "(panel)" are a Next.js route group: they organise the
// files WITHOUT changing the address. So
//    app/admin/(panel)/dashboard/page.tsx   ->   /admin/dashboard
//
// ========================================
// HOW THIS AREA IS PROTECTED
// ========================================
// 1. middleware.ts         - sends anyone without an ADMIN session to the
//                            login page before this layout even runs.
// 2. requireAdmin() BELOW  - re-checks on the SERVER that the signed-in user
//                            still has the ADMIN role in the database.
//
// A normal member who types /admin/dashboard into the address bar is therefore
// stopped on the server and sent to /unauthorized. Hiding the menu link is NOT
// what protects the panel.
// ========================================

import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { AdminMobileNav, AdminNav } from '@/components/admin/AdminNav';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { LogoMark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';
import { isSuperAdminRole } from '@/lib/constants';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // ---------- SERVER-SIDE AUTHORIZATION ----------
  // Not signed in        -> redirected to /admin/login
  // Signed in as MEMBER  -> redirected to /unauthorized
  // Only ADMIN continues past this line.
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* ========================================
          ADMIN HEADER
          ======================================== */}
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-brand-700 via-brand-600 to-accent-500" />

        <Container className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoMark size={34} />
            <div className="leading-tight">
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                <Icon name="shield-check" className="h-4 w-4 text-brand-600" />
                Admin Panel
              </p>
              <p className="hidden text-xs text-ink-500 sm:block">{organization.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Who is signed in */}
            <div className="hidden items-center gap-2 rounded-btn border border-ink-200 px-3 py-1.5 sm:flex">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs">
                <span className="block font-semibold text-ink-800">{user.name}</span>
                <span className="block text-ink-500">Administrator</span>
              </span>
            </div>

            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-btn px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 md:inline-flex"
            >
              <Icon name="external-link" className="h-4 w-4" />
              View website
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
            {/* Sidebar (desktop only) */}
            <aside className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-24">
                {/* The Super Admin only sections (Loan management) are left out
                    of the menu for everybody else. The pages themselves check
                    the role again on the server. */}
                <AdminNav isSuperAdmin={isSuperAdminRole(user.role)} />
              </div>
            </aside>

            <div className="min-w-0 lg:col-span-9">
              {/* Quick menu (mobile only) */}
              <div className="mb-6">
                <AdminMobileNav isSuperAdmin={isSuperAdminRole(user.role)} />
              </div>

              {children}
            </div>
          </div>
        </Container>
      </div>

      <footer className="border-t border-ink-200 bg-white py-5">
        <Container className="text-center text-xs text-ink-500">
          {organization.name} · Administration area · Signed in as {user.name}
        </Container>
      </footer>
    </div>
  );
}
