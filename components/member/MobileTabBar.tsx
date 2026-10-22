'use client';

// ========================================
// MEMBER PANEL - THE PHONE BAR
// ========================================
// The five buttons pinned to the bottom of the screen on a phone, where a
// thumb reaches without looking.
//
// WHY THESE FIVE
//   They are the pages a member opens daily: the dashboard, their tasks, the
//   fund, their alerts and themselves. Everything else is in the dark green menu
//   on a laptop, and on a phone it is one tap further from "Profile".
//
// The bar sits above the home indicator (pb-[env(safe-area-inset-bottom)]) so it
// never collides with the phone's own gesture area.
// ========================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { MOBILE_TABS } from '@/components/member/MemberNav';

export function MobileTabBar({ unread = 0, pendingPayments = 0 }: { unread?: number; pendingPayments?: number }) {
  const pathname = usePathname();

  function active(href: string): boolean {
    const path = href.split('?')[0];
    if (path === '/member/dashboard') return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <nav
      aria-label="Member panel quick links"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {MOBILE_TABS.map((tab) => {
          const isActive = active(tab.href);
          const badge =
            tab.badge === 'unread' ? unread : tab.badge === 'payments' ? pendingPayments : 0;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-brand-700' : 'text-ink-400 hover:text-ink-600',
                )}
              >
                <span className="relative">
                  <Icon name={tab.icon} className="h-5 w-5" />
                  {badge > 0 ? (
                    <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}
                </span>
                {tab.label}
                {isActive ? (
                  <span className="absolute inset-x-4 -top-px h-0.5 rounded-full bg-brand-600" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
