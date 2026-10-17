// ========================================
// ADMIN PANEL - THE BELL
// ========================================
// WHY THIS EXISTS
//   The menu had a "Notifications" link and nothing else. A donation could be
//   submitted, a note could sit waiting, and the only way to find out was to open
//   the page on the off-chance. That is not a notification - that is a page.
//
// WHAT IT DOES NOW
//   A bell in the admin header carries a red count of everything unread. It
//   refreshes itself:
//     - once when the panel loads
//     - every 45 seconds while the tab is visible
//     - whenever the tab is brought back into focus
//
//   So a donor submitting a payment shows up at the top of the screen within a
//   minute, without anybody pressing anything.
//
// WHY IT POLLS INSTEAD OF USING A LIVE CONNECTION
//   A websocket needs a server to hold the connection open, which this project
//   does not run. A single small request every 45 seconds costs almost nothing
//   and works on any host, including Vercel's serverless functions.
//
// WHAT IT NEVER DOES
//   It only reads the count for the signed-in administrator. The list itself and
//   every action on it still go through /api/notifications, which checks the
//   session server-side.
// ========================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

const POLL_MS = 45_000;

export function NotificationBell({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);
  const [bumped, setBumped] = useState(false);
  const previous = useRef(initialCount);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) return;

      const next = Number(payload.data?.unread ?? 0);
      setCount(next);

      // A brief highlight when the number goes up, so somebody who is looking at
      // the screen notices without refreshing.
      if (next > previous.current) {
        setBumped(true);
        window.setTimeout(() => setBumped(false), 2500);
      }

      previous.current = next;
    } catch {
      // Offline or a sleeping tab: keep the last known number rather than
      // flashing zero, which would look like "nothing to do".
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);

    const onFocus = () => void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return (
    <Link
      href="/admin/notifications"
      aria-label={
        count > 0 ? `Notifications - ${count} unread` : 'Notifications - nothing unread'
      }
      title={count > 0 ? `${count} unread notification${count === 1 ? '' : 's'}` : 'Notifications'}
      className={`relative inline-flex items-center gap-1.5 rounded-btn border px-3 py-2 text-sm font-medium transition ${
        count > 0
          ? 'border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100'
          : 'border-ink-300 text-ink-700 hover:border-brand-300 hover:text-brand-700'
      } ${bumped ? 'ring-2 ring-brand-400' : ''}`}
    >
      <Icon name="bell" className="h-4 w-4" />
      <span className="hidden sm:inline">Notifications</span>

      {count > 0 ? (
        <span className="ml-0.5 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
