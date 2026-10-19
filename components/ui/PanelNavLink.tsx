// ========================================
// PANEL NAVIGATION LINK
// ========================================
// One link in the Admin Panel or Member Panel menu.
//
// WHY THIS EXISTS
//   1. THE CLICKED ITEM SHOWS "Please wait..."
//      In the organization's orange accent colour, right where the person
//      clicked - not a full-page overlay somewhere else. It disappears when the
//      new page has actually arrived, or after a few seconds if it never does.
//
//   2. THE PAGE DOES NOT JUMP ABOUT
//      Next.js normally scrolls to the very top of the document after a click.
//      In a panel with a long sidebar that moves the menu off the screen, which
//      is exactly the complaint this fixes. We keep the scroll position and only
//      bring the content area into view when it is genuinely off-screen.
//
// The link is still a real <a href>, so it works with a middle-click, opens in a
// new tab, and is readable by a screen reader.
// ========================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PanelNavLink({
  href,
  active,
  className,
  children,
  pendingLabel = 'Please wait…',
}: {
  href: string;
  active: boolean;
  className?: string;
  children: ReactNode;
  /** The words shown while the page is loading. */
  pendingLabel?: string;
}) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  // ---------- the new page has arrived ----------
  useEffect(() => {
    if (!pending) return;

    setPending(false);

    // NOTHING is scrolled here on purpose.
    //
    // The person clicked a menu item that was already on screen. Moving the page
    // afterwards is what made the menu disappear and forced them to scroll again
    // to find the same item. With scroll={false} above, the browser keeps the
    // exact position, so the clicked item stays where the finger left it and the
    // new section opens in the content area beside/below it.
  }, [pathname, pending]);

  // ---------- never leave the indicator spinning for ever ----------
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(false), 5000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return (
    <Link
      href={href}
      // Keep the scroll position instead of jumping to the top of the document.
      scroll={false}
      aria-current={active ? 'page' : undefined}
      aria-busy={pending || undefined}
      onClick={() => setPending(true)}
      className={cn(className, pending && 'cursor-progress')}
    >
      {children}

      {pending ? (
        <span
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-accent-600"
          // A screen reader hears that something is happening.
          role="status"
        >
          <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-500" />
          {pendingLabel}
        </span>
      ) : null}
    </Link>
  );
}
