// ========================================
// "DONATION SUCCESSFUL" - THE GREEN POPUP
// ========================================
// When the office confirms a payment, the donor should find out the next time
// they open their dashboard - not by accident, and not only in an email they may
// never read.
//
// WHY IT IS A POPUP AND NOT A TOAST
//   A toast disappears after four seconds. A donor who checks their phone a day
//   later would see nothing. This waits on the page, and it is the first thing
//   they see when it is genuinely new.
//
// WHY THE SERVER DECIDES WHETHER IT SHOWS
//   The first version read localStorage in useEffect, so nothing was in the HTML
//   and the banner appeared a moment later - or never, if the script failed. The
//   server now reads the dismissal cookie and decides before rendering: no flash,
//   no empty frame, visible the instant the page arrives.
//
// WHY ONLY ONCE
//   Dismissing writes one cookie holding the id of the donation that was read.
//   Next visit the popup stays away. A second, newer approval gets its own id, so
//   it is announced in its own right - the cookie only remembers the latest.
//
// THE ANIMATION
//   The tick draws itself (stroke-dashoffset), then the card rises. Both are
//   disabled under prefers-reduced-motion; the content is identical either way.
// ========================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export type ApprovedDonation = {
  id: string;
  amount: string;
  purpose: string;
  /** "22 Oct 2026, 14:05 - 5 Kartik 2082, 14:05" */
  when: string;
};

/** The cookie the dashboard reads. Kept here so the two cannot drift apart. */
export const APPROVED_BANNER_COOKIE = 'jsyc_banner_seen';

export function DonationApprovedBanner({
  donation,
  initiallyVisible,
}: {
  donation: ApprovedDonation;
  initiallyVisible: boolean;
}) {
  const [visible, setVisible] = useState(initiallyVisible);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Escape closes it, and the close button takes focus so a keyboard user is not
  // trapped behind a dialog they cannot see.
  useEffect(() => {
    if (!visible) return;

    // Marked as seen the moment it is shown, not only when Dismiss is pressed.
    // The brief asks for a popup on the change from Pending to Approved, not on
    // every page load - so a reload an hour later must not announce it again. The
    // donation itself stays in the history with its Verified status, which is the
    // lasting record; this is only the announcement.
    markSeen();

    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  function markSeen() {
    try {
      // A year is long enough to be forgotten, short enough to expire on its own.
      // Not HttpOnly: only this script needs it, and it holds no secret.
      document.cookie = `${APPROVED_BANNER_COOKIE}=${donation.id}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Cookies blocked: it will simply appear again next time.
    }
  }

  function dismiss() {
    markSeen();
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1a12]/45 p-4 backdrop-blur-[2px] sm:items-center">
      <style>{`
        @keyframes approve-pop {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes approve-tick {
          from { stroke-dashoffset: 48; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes approve-ring {
          from { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.06); opacity: 1; }
          to   { transform: scale(1); opacity: 1; }
        }
        .approve-card { animation: approve-pop 0.42s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .approve-ring { animation: approve-ring 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .approve-tick {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: approve-tick 0.5s 0.18s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .approve-card, .approve-ring, .approve-tick { animation: none !important; stroke-dashoffset: 0 !important; }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-title"
        className="approve-card w-full max-w-md overflow-hidden rounded-3xl border border-green-200 bg-white shadow-[0_30px_80px_-20px_rgba(6,78,59,0.45)]"
      >
        {/* ---------- the green head ---------- */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 px-6 pb-7 pt-8 text-center text-white">
          <button
            ref={closeRef}
            type="button"
            onClick={dismiss}
            aria-label="Close this message"
            className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>

          <span className="approve-ring mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
            <svg viewBox="0 0 52 52" className="h-9 w-9" aria-hidden="true">
              <path
                className="approve-tick"
                d="M14 27.5 L22.5 36 L38 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <h2 id="approve-title" className="mt-4 text-lg font-bold tracking-tight">
            Donation Successful!
          </h2>
          <p className="mt-1 text-sm text-white/85">Your payment has been verified by the club office.</p>
        </div>

        {/* ---------- the thanks ---------- */}
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-ink-700">
            Thank you so much for your generous donation to Janakalyan Samata Yuwa Club. Your kindness
            and support mean a great deal to our community and help us continue our work. We truly
            appreciate your generosity!
          </p>

          <dl className="mt-4 space-y-2 rounded-2xl bg-green-50/70 p-4 text-sm ring-1 ring-green-100">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-green-800/70">Amount</dt>
              <dd className="font-bold text-green-900">{donation.amount}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-green-800/70">Purpose</dt>
              <dd className="text-right font-medium text-green-900">{donation.purpose}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-green-800/70">Approved</dt>
              <dd className="text-right text-green-900">{donation.when}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-green-800/70">Reference</dt>
              <dd className="break-all text-right font-mono text-[11px] text-green-900">{donation.id}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <Link
              href={`/donate/submitted/${donation.id}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              See the receipt
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
