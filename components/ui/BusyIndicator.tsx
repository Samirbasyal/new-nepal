// ========================================
// UI - "PLEASE WAIT..." INDICATOR
// ========================================
// WHAT IT DOES
//   While something is loading, a thin bar appears along the top of the screen
//   with a small "Please wait..." pill under it. It disappears by itself when
//   the work has finished.
//
// WHY IT IS NEEDED
//   Without it, clicking "Save" or opening a slow page looks like nothing
//   happened, and people click again - which can save the same thing twice.
//
// WHERE IT IS ADDED
//   Once, in app/layout.tsx. That file wraps the WHOLE website (public pages,
//   member panel and admin panel), so this one line covers every page.
//
// WHAT IT WATCHES - automatically, no per-button work needed
//   1. Any form being submitted (Save, Add, Delete, Approve...)
//   2. Any link that opens another page inside this website
//   3. Anything that asks for it with setBusy(true) / setBusy(false)
//
//   A link that opens a new tab, a download, or a click with CTRL / SHIFT held
//   down is ignored, because those do not load a new page.
//
// WHY IT WAITS 250 ms BEFORE APPEARING
//   A quick action finishes before then, so the pill never flashes on screen
//   for something that was instant. Only real waiting is shown.
//
// WHY IT GIVES UP AFTER 25 SECONDS
//   If an action never reports back, the pill still disappears instead of
//   sitting there forever. It is a safety net, not a timer you should rely on.
// ========================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// ========================================
// THE SMALL PUBLIC API
// ========================================
// Any component that does its own loading with fetch() can show the same
// indicator:
//
//     import { setBusy } from '@/components/ui/BusyIndicator';
//     setBusy(true, 'Approving...');
//     ...
//     setBusy(false);
//
// Keep the text short - it sits in a small pill.
// ========================================

const BUSY_EVENT = 'app:busy';

export function setBusy(busy: boolean, label = 'Please wait...') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BUSY_EVENT, { detail: { busy, label } }));
}

const APPEAR_AFTER_MS = 250;
const GIVE_UP_AFTER_MS = 25000;
const DEFAULT_LABEL = 'Please wait...';

export function BusyIndicator() {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState(DEFAULT_LABEL);

  // How many things are loading right now. A number rather than true/false, so
  // two actions at the same time do not switch the indicator off too early.
  const pending = useRef(0);
  const appearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giveUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    function clearTimers() {
      if (appearTimer.current) { clearTimeout(appearTimer.current); appearTimer.current = null; }
      if (giveUpTimer.current) { clearTimeout(giveUpTimer.current); giveUpTimer.current = null; }
    }

    function stop() {
      pending.current = 0;
      clearTimers();
      setVisible(false);
    }

    function start(text: string) {
      pending.current += 1;
      setLabel(text);

      // Show only if this is still loading a moment later.
      if (!appearTimer.current) {
        appearTimer.current = setTimeout(() => {
          appearTimer.current = null;
          setVisible(true);
        }, APPEAR_AFTER_MS);
      }

      // Safety net, refreshed on every new action.
      if (giveUpTimer.current) clearTimeout(giveUpTimer.current);
      giveUpTimer.current = setTimeout(stop, GIVE_UP_AFTER_MS);
    }

    // ---------- 1. A form is being submitted ----------
    function onSubmit() {
      start(DEFAULT_LABEL);
    }

    // ---------- 2. A link to another page was clicked ----------
    function onClick(event: MouseEvent) {
      // CTRL / SHIFT / CMD or the middle button: opens a new tab, no waiting.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Leave the browser alone for external sites, downloads and page anchors.
      if (!href.startsWith('/')) return;
      if (anchor.getAttribute('target') === '_blank') return;
      if (anchor.hasAttribute('download')) return;
      // A pure "#section" link does not load anything.
      if (href.startsWith('/#')) return;

      start(DEFAULT_LABEL);
    }

    // ---------- 3. Something asked for it directly ----------
    function onBusyEvent(event: Event) {
      const detail = (event as CustomEvent<{ busy?: boolean; label?: string }>).detail;
      if (detail && detail.busy === false) {
        // One action finished. If nothing else is loading, hide.
        pending.current = Math.max(0, pending.current - 1);
        if (pending.current === 0) stop();
        return;
      }
      start(detail?.label || DEFAULT_LABEL);
    }

    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener(BUSY_EVENT, onBusyEvent);

    return () => {
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(BUSY_EVENT, onBusyEvent);
      clearTimers();
    };
  }, []);

  // ========================================
  // THE NEW PAGE HAS ARRIVED - HIDE
  // ========================================
  // Next.js keeps this component alive while you move between pages, so the
  // address is what tells us that the wait is over.
  useEffect(() => {
    pending.current = 0;
    if (appearTimer.current) { clearTimeout(appearTimer.current); appearTimer.current = null; }
    if (giveUpTimer.current) { clearTimeout(giveUpTimer.current); giveUpTimer.current = null; }
    setVisible(false);
  }, [pathname]);

  if (!visible) return null;

  return (
    // aria-live tells a screen reader that something is happening, and
    // pointer-events-none means the indicator can never swallow a click.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100]"
    >
      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden bg-brand-100">
        <div className="h-full w-1/3 animate-pulse rounded-r-full bg-brand-600" />
      </div>

      {/* Pill */}
      <div className="flex justify-center pt-3">
        <span className="flex items-center gap-2 rounded-full bg-ink-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
            />
          </svg>
          {label}
        </span>
      </div>
    </div>
  );
}
