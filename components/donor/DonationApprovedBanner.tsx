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
//   dismissed, so the news is there whenever they arrive.
//
// WHERE THE DISMISSAL IS KEPT
//   In localStorage, keyed by the donation's id. That means: dismissing it on a
//   phone does not silence it on a laptop, and the banner never comes back once
//   it has been read. Nothing is written to the database - this is a reading
//   preference, not a financial record.
//
// WHY THE DATES COME IN ALREADY FORMATTED
//   The Bikram Sambat conversion belongs on the server (lib/nepali-date), so the
//   component is handed strings and does not need to know the calendar at all.
// ========================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export type ApprovedDonation = {
  id: string;
  amount: string;
  purpose: string;
  /** "22 Oct 2026, 14:05 - 5 Kartik 2082, 14:05" */
  when: string;
};

const storageKey = (id: string) => `donor-approved-seen:${id}`;

export function DonationApprovedBanner({ donation }: { donation: ApprovedDonation | null }) {
  // Starts hidden: the server cannot see localStorage, so showing it first and
  // hiding it afterwards would flash the banner at somebody who dismissed it long
  // ago. One frame of nothing is better than one frame of wrong.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!donation) return;
    try {
      setVisible(window.localStorage.getItem(storageKey(donation.id)) !== '1');
    } catch {
      // Private mode, or storage disabled: show it rather than swallow the news.
      setVisible(true);
    }
  }, [donation]);

  if (!donation || !visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(donation!.id), '1');
    } catch {
      // Nothing to do - it will simply appear again next time.
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
