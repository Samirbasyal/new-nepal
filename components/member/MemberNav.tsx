// ========================================
// MEMBER PANEL - NAVIGATION
// ========================================
// The menu inside the member panel.
//
// On a large screen it appears as a sidebar on the left.
// On a phone it becomes a row of buttons that can be scrolled sideways, so the
// content is never pushed off the screen.
//
// "use client" is used only so the current page can be highlighted.
// ========================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { PanelNavLink } from '@/components/ui/PanelNavLink';
import { cn } from '@/lib/utils';

// Every entry in the member menu. Add a page in app/member/(panel)/ and add
// its link here.
const MEMBER_LINKS: { label: string; href: string; icon: IconName }[] = [
  { label: 'Dashboard', href: '/member/dashboard', icon: 'grid' },
  { label: 'My profile', href: '/member/profile', icon: 'user' },
  { label: 'My tasks', href: '/member/tasks', icon: 'check-circle' },
  { label: 'My responsibilities', href: '/member/duties', icon: 'shield-check' },

  // ========================================
  // MONTHLY FUND (Donation & Fund System)
  // ========================================
  { label: 'Monthly fund', href: '/member/fund', icon: 'banknote' },
  { label: 'Pay fund', href: '/member/fund/pay', icon: 'upload' },
  { label: 'Fund history', href: '/member/fund/history', icon: 'list' },

  // ========================================
  // LOANS (read-only for a member)
  // ========================================
  // Loan money is completely separate from the monthly fund, so it has its own
  // entry and its own history. A member can look, but never change anything.
  { label: 'My loans', href: '/member/loans', icon: 'briefcase' },

  // ========================================
  // NOTIFICATIONS AND MESSAGES
  // ========================================
  // Notifications: every reminder and decision that concerns this member
  // (monthly fund, payments, loans, account, notices from the office).
  // Messages: the member's own conversation with the office.
  { label: 'Notifications', href: '/member/notifications', icon: 'bell' },
  { label: 'Messages', href: '/member/messages', icon: 'mail' },
  { label: 'My notes', href: '/member/notes', icon: 'file-text' },

  { label: 'Notices', href: '/news?type=NOTICE', icon: 'bell' },
  { label: 'Programs', href: '/programs', icon: 'layers' },
  { label: 'Events', href: '/events', icon: 'calendar' },
];

export function MemberNav({
  memberName,
  pendingPayments = 0,
}: {
  memberName: string;
  /** How many fund payments this member has waiting for approval. */
  pendingPayments?: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* ========================================
          MOBILE: HORIZONTAL BUTTON ROW
          ======================================== */}
      {/* MOBILE: the pending payment follows the member around the panel */}
      {pendingPayments > 0 ? (
        <div className="mb-3 flex items-center gap-2 rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 lg:hidden">
          <Icon name="clock" className="h-4 w-4 shrink-0" />
          Pending Payment · waiting for approval
        </div>
      ) : null}

      <nav
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
        aria-label="Member panel menu"
      >
        {MEMBER_LINKS.map((item) => (
          <PanelNavLink
            key={item.href}
            href={item.href}
            active={isActive(item.href)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
              isActive(item.href)
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-ink-700 ring-ink-300',
            )}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.label}
            {item.href === '/member/fund/pay' && pendingPayments > 0 ? (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingPayments}
              </span>
            ) : null}
          </PanelNavLink>
        ))}
      </nav>

      {/* ========================================
          DESKTOP: SIDEBAR
          ======================================== */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          {/* Who is signed in */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {memberName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{memberName}</p>
                <p className="text-xs text-ink-500">Member</p>
              </div>
            </div>
          </div>

          {/* ========================================
              PENDING PAYMENT
              Shown until an administrator approves or rejects the payment. The
              number comes from the database on every page load, so it survives a
              refresh and a new login.
              ======================================== */}
          {pendingPayments > 0 ? (
            <div className="card border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
                <Icon name="clock" className="h-4 w-4" />
                Pending Payment
              </div>
              <p className="mt-1 text-xs leading-relaxed text-amber-700">
                {pendingPayments === 1
                  ? 'One payment is waiting for the office to verify it.'
                  : `${pendingPayments} payments are waiting for the office to verify them.`}
              </p>
            </div>
          ) : null}

          {/* Menu */}
          <nav className="card p-2" aria-label="Member panel menu">
            <ul className="space-y-0.5">
              {MEMBER_LINKS.map((item) => (
                <li key={item.href}>
                  <PanelNavLink
                    href={item.href}
                    active={isActive(item.href)}
                    className={cn(
                      'flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink-700 hover:bg-ink-100',
                    )}
                  >
                    <Icon name={item.icon} className="h-4 w-4" />
                    {item.label}
                    {item.href === '/member/fund/pay' && pendingPayments > 0 ? (
                      <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {pendingPayments}
                      </span>
                    ) : null}
                  </PanelNavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Back to the public website + sign out */}
          <div className="card p-2">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
            >
              <Icon name="home" className="h-4 w-4" />
              Back to website
            </Link>

            <LogoutButton className="w-full rounded-btn px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50" />
          </div>
        </div>
      </aside>
    </>
  );
}
