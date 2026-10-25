// ========================================
// "YOUR DONATION WAS APPROVED" - A BANNER THAT WAITS
// ========================================
// When the office confirms a payment, the donor should find out the next time
// they open their dashboard - not by accident, and not only in an email they may
// never read.
//
// WHY IT IS NOT A TOAST
//   A toast disappears after four seconds. A donor who checks their phone a day
//   later would see nothing. This sits at the top of the dashboard until it is
//   dismissed.
//
// WHY THE SERVER DECIDES WHETHER IT SHOWS
//   The first version read localStorage in useEffect, so the banner was missing
//   from the HTML and appeared a moment later - and never at all if the script
//   failed to load. A thank-you that needs JavaScript is a poor thank-you.
//
//   Now the server reads the dismissal cookie and renders the banner as part of
//   the page. No flash, no empty frame, and it is visible the instant the page
//   arrives. Dismissing writes one cookie: the id of the donation that was read.
//   Only the latest id is kept, because only the latest matters - an older
//   confirmation is not news.
// ========================================

'use client';

import { useState } from 'react';
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

  if (!visible) return null;

  function dismiss() {
    try {
      // A year is long enough to be forgotten, short enough to expire on its own.
      // Not HttpOnly: only this script needs it, and it holds no secret.
      document.cookie = `${APPROVED_BANNER_COOKIE}=${donation.id}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Cookies blocked: it will simply appear again next time.
    }

    setVisible(false);
  }

  return (
    <div
      role="status"
      className="mt-6 overflow-hidden rounded-card border border-green-300 bg-gradient-to-br from-green-50 to-emerald-50/70 p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <Icon name="check-circle" className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-green-900">
            Donation successful - the office has confirmed your payment
          </p>
          <p className="mt-1 text-sm text-green-900/80">
            {donation.amount} for {donation.purpose}, received {donation.when}. Thank you - your gift is
            now part of the club&apos;s verified funds.
          </p>
          <p className="mt-1 text-xs text-green-800/70">
            Only confirmed donations count towards the club&apos;s totals, so this one is included.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Link
              href={`/donate/submitted/${donation.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-green-800 hover:underline"
            >
              See the receipt
              <Icon name="arrow-right" className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-semibold text-green-800/70 hover:text-green-900 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this message"
          className="shrink-0 rounded-full p-1 text-green-700/60 transition hover:bg-green-100 hover:text-green-900"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
