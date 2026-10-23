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
// THE SHAPE OF THE SCREEN
// ========================================
// A dark navy menu down the left edge, a white bar across the top, and the page
// itself on a very light blue background - the layout of the approved design.
// On a small screen the menu becomes a row of quick links above the page, so
// nothing is lost on a phone.
// ========================================

import { NotificationsChangedSync } from '@/components/shared/NotificationsChangedSync';
import { cache } from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { getLanguage } from '@/lib/i18n-server';
import { LangProvider } from '@/components/ui/LangProvider';
import { AdminMobileNav, AdminNav } from '@/components/admin/AdminNav';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { LogoMark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';
import { isSuperAdminRole } from '@/lib/constants';
import { organization } from '@/config/site';
import { unreadNotificationCount } from '@/lib/notifications';
import { countPendingRequests } from '@/lib/membership/service';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * How many payments are waiting to be verified - the number shown as a badge
 * next to "Payment verification" in the menu.
 *
 * WHY IT IS WRAPPED IN cache()
 *   cache() remembers the answer for the duration of ONE request. Without it
 *   the count would be asked again for every component that wanted it in the
 *   same page load. It is still exactly one COUNT query per page, which is the
 *   cheapest kind there is.
 *
 * WHY IT FAILS QUIETLY
 *   This is a signpost, not a feature. If the database is not reachable or not
 *   configured yet, the count is simply 0 and the menu still works - an admin
 *   panel that refuses to load because a badge could not be counted would be a
 *   far worse problem than a missing badge.
 */
const countPendingPayments = cache(async (): Promise<number> => {
  if (!isDatabaseConfigured()) return 0;

  try {
    return await prisma.fundPayment.count({
      where: { status: 'PENDING', isDeleted: false },
    });
  } catch {
    return 0;
  }
});

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // ---------- SERVER-SIDE AUTHORIZATION ----------
  // Not signed in        -> redirected to /admin/login
  // Signed in as MEMBER  -> redirected to /unauthorized
  // Only ADMIN continues past this line.
  const user = await requireAdmin();
  const lang = await getLanguage();
  const isSuperAdmin = isSuperAdminRole(user.role);

  const pendingCount = await countPendingPayments();

  // How many people are waiting to be let in. 0 is a perfectly normal answer and
  // simply hides the badge; the nav keeps this number up to date by itself after
  // the first paint (see components/admin/AdminNav.tsx).
  const pendingRequests = await countPendingRequests();

  // The bell in the header. Loaded on the server so the number is right on the
  // very first paint, then kept fresh by the component itself.
  const unreadNotifications = await unreadNotificationCount(user.id);

  // The administrator's own picture (Admin Panel -> Settings -> My picture).
  const adminPhoto = await prisma.user
    .findUnique({ where: { id: user.id }, select: { photoUrl: true } })
    .then((row) => row?.photoUrl ?? null)
    .catch(() => null);

  return (
    <div className="flex min-h-screen bg-[#f5f8fc] lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <NotificationsChangedSync />
      {/* ========================================
          THE MENU (desktop)
          ======================================== */}
      {/* print:hidden - a printed report should carry the table, not the menu */}
      <aside className="hidden w-[264px] shrink-0 flex-col bg-[#0a3b2c] lg:flex print:hidden">
        {/* Who this panel belongs to */}
        <div className="flex items-center gap-2.5 px-4 py-4">
          <LogoMark size={34} />
          <span className="text-[13px] font-bold leading-tight text-white">{organization.name}</span>
        </div>

        {/* The menu scrolls on its own, so a long list never moves the page */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-6">
          <AdminNav
            isSuperAdmin={isSuperAdmin}
            pendingCount={pendingCount}
            pendingRequests={pendingRequests}
            lang={lang}
          />
        </div>

        {/* ---------- the way out, at the very bottom ---------- */}
        <div className="border-t border-white/10 px-3 py-3">
          <LogoutButton className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-white/15" />
          <p className="mt-2 text-center text-[10px] text-white/40">
            {organization.name}
          </p>
        </div>
      </aside>

      {/* ========================================
          THE REST OF THE SCREEN
          ======================================== */}
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
        {/* ---------- Top bar ---------- */}
        <header className="sticky top-0 z-40 border-b border-ink-200 bg-white lg:static print:hidden">
          <Container className="flex h-16 items-center justify-between gap-3 lg:max-w-none lg:px-6">
            <div className="flex items-center gap-2.5">
              {/* On a phone the menu is hidden, so the club mark stays here */}
              <span className="lg:hidden">
                <LogoMark size={30} />
              </span>
              <span className="text-sm font-bold text-ink-900 lg:text-[13px] lg:font-semibold lg:text-ink-500">
                {t(lang, 'admin.panel')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* New donations, payments and member activity show up here without
                  anybody refreshing: the bell keeps its own count up to date. */}
              <NotificationBell initialCount={unreadNotifications} />

              <Link
                href="/"
                className="hidden items-center gap-1.5 rounded-btn px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 md:inline-flex"
              >
                <Icon name="external-link" className="h-4 w-4" />
                {t(lang, 'admin.viewWebsite')}
              </Link>

              {/* Who is signed in - their own picture if they uploaded one */}
              <div className="hidden items-center gap-2 sm:flex">
                <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xs font-bold text-white">
                  {adminPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={adminPhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="leading-tight">
                  <span className="block text-[13px] font-semibold text-ink-900">{user.name}</span>
                  <span className="block text-[11px] text-ink-500">
                    {isSuperAdmin ? t(lang, 'admin.superAdmin') : t(lang, 'admin.administrator')}
                  </span>
                </span>
              </div>

            </div>
          </Container>
        </header>

        {/* ---------- The page ---------- */}
        <main
          id="panel-content"
          className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain"
        >
          {/* Quick menu (mobile only) */}
          <div className="mb-6 lg:hidden">
            <AdminMobileNav
              isSuperAdmin={isSuperAdmin}
              pendingCount={pendingCount}
              pendingRequests={pendingRequests}
            />
          </div>

          <LangProvider lang={lang}>{children}</LangProvider>
        </main>
      </div>

      {/* Small print on a phone, where the dark menu is not shown */}
      <footer className="border-t border-ink-200 bg-white py-5 lg:hidden">
        <Container className="text-center text-xs text-ink-500">
          {organization.name} · {user.name}
        </Container>
      </footer>
    </div>
  );
}
