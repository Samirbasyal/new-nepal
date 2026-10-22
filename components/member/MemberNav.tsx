'use client';

// ========================================
// MEMBER PANEL - THE MENU
// ========================================
// The dark green column on the left of the member panel (and the source of the
// links the mobile bar uses).
//
// WHY IT IS ONE LIST, GROUPED
//   Everything a member can open is here, in the order they need it: the work
//   first (tasks, duties, performance), then the money, then messages, then the
//   public pages. Nothing is hidden behind a submenu, so nothing gets lost.
//
// WHAT THE BADGES MEAN
//   - Notifications: how many are unread
//   - Pay fund: how many payments are waiting for the office to confirm
//   Both come from the server (layout -> props), not from the browser.
// ========================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/i18n';

type Item = { label: string; href: string; icon: IconName; badge?: 'payments' | 'unread' };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Main',
    items: [{ label: 'Dashboard', href: '/member/dashboard', icon: 'grid' }],
  },
  {
    title: 'My work',
    items: [
      { label: 'My profile', href: '/member/profile', icon: 'user' },
      { label: 'My tasks', href: '/member/tasks', icon: 'check-circle' },
      { label: 'My responsibilities', href: '/member/duties', icon: 'shield-check' },
      { label: 'My performance', href: '/member/performance', icon: 'chart' },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Monthly fund', href: '/member/fund', icon: 'banknote' },
      { label: 'Pay fund', href: '/member/fund/pay', icon: 'upload', badge: 'payments' },
      { label: 'Fund history', href: '/member/fund/history', icon: 'list' },
      { label: 'My loans', href: '/member/loans', icon: 'briefcase' },
    ],
  },
  {
    title: 'Inbox',
    items: [
      { label: 'Notifications', href: '/member/notifications', icon: 'bell', badge: 'unread' },
      { label: 'Messages', href: '/member/messages', icon: 'mail' },
      { label: 'My notes', href: '/member/notes', icon: 'file-text' },
    ],
  },
  {
    title: 'Explore',
    items: [
      { label: 'Notices', href: '/news?type=NOTICE', icon: 'megaphone' },
      { label: 'Programs', href: '/programs', icon: 'layers' },
      { label: 'Events', href: '/events', icon: 'calendar' },
    ],
  },
];

/** The four links the phone bar carries (see MobileTabBar). */
export const MOBILE_TABS: Item[] = [
  { label: 'Home', href: '/member/dashboard', icon: 'home' },
  { label: 'Tasks', href: '/member/tasks', icon: 'check-circle' },
  { label: 'Fund', href: '/member/fund', icon: 'banknote' },
  { label: 'Alerts', href: '/member/notifications', icon: 'bell', badge: 'unread' },
  { label: 'Profile', href: '/member/profile', icon: 'user' },
];

export function MemberNav({
  memberName,
  lang,
  pendingPayments = 0,
  unread = 0,
}: {
  memberName: string;
  lang: Lang;
  pendingPayments?: number;
  unread?: number;
}) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    const path = href.split('?')[0];
    if (path === '/member/dashboard') return pathname === path;
    // A sub-page keeps its section lit (fund/pay lights "Monthly fund" too).
    if (path === '/member/fund') return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  function badgeFor(item: Item): number {
    if (item.badge === 'payments') return pendingPayments;
    if (item.badge === 'unread') return unread;
    return 0;
  }

  return (
    <nav aria-label="Member panel menu" className="flex h-full flex-col">
      {/* ---------- who is signed in ---------- */}
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white ring-1 ring-white/25">
            {memberName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{memberName}</p>
            <p className="text-[11px] text-emerald-100/70">Member</p>
          </div>
        </div>
      </div>

      {/* ---------- the links ---------- */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-4 last:mb-0">
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100/45">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const badge = badgeFor(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                          : 'text-emerald-50/75 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {badge > 0 ? (
                        <span className="ml-auto rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-[#0b3b2e]">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
