// ========================================
// ADMIN PANEL - DELETE A DONATION FOR GOOD
// ========================================
// THE DIFFERENCE FROM THE ORDINARY DELETE BUTTON
//   "Delete" hides a donation: it disappears from the lists and the totals but the
//   row is kept, and "Removed" can bring it back. That is the right default.
//
//   This button destroys the row. It exists for the things that should never have
//   been in the book: a demo, a duplicate, a test of NPR 500, a donation typed
//   twice.
//
// WHY IT ASKS FOR A TYPED WORD
//   A confirm() dialog is one stray Enter away from wiping a financial record. The
//   administrator has to type DELETE, and the server checks the same word again -
//   so neither a mis-click nor a stray request can trigger it.
//
// WHAT THE DIALOG SHOWS BEFORE ANYTHING HAPPENS
//   The amount, the donor, the cause and the date, in full. A person should never
//   have to guess which record they are about to lose.
//
// WHAT IS NOT LOST
//   The donor's account and their other donations stay. The activity log keeps a
//   line naming what was removed and who removed it, because that is what an
//   auditor asks about afterwards.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/fund/calc';

export type DeletableDonation = {
  id: string;
  donorName: string;
  amount: number;
  purpose: string | null;
  /** ISO date, so it can travel from a server component to the browser. */
  receivedOn: string;
  status: string;
  hasReceipt: boolean;
};

export function DonationPermanentDelete({
  donation,
  variant = 'link',
}: {
  donation: DeletableDonation;
  /** "link" sits in a row of buttons; "button" is the primary action on a page. */
  variant?: 'link' | 'button';
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setWord('');
    setReason('');
    setProblem(null);
  }

  async function remove() {
    if (word.trim().toUpperCase() !== 'DELETE') {
      setProblem('Please type DELETE to confirm.');
      return;
    }

    setBusy(true);
    setProblem(null);

    try {
      const response = await fetch(`/api/admin/donations/${donation.id}/permanent`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE', reason: reason.trim() }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'The donation could not be deleted. Please try again.');
        return;
      }

      setOpen(false);
      router.push('/admin/donations');
      router.refresh();
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === 'button'
            ? 'btn btn-outline btn-sm text-red-700'
            : 'text-xs font-semibold text-red-700 underline-offset-2 hover:underline'
        }
      >
        <Icon name="trash" className="mr-1.5 inline h-3.5 w-3.5" />
        Delete permanently
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-900/60 p-4 py-10"
          role="dialog"
          aria-modal="true"
          aria-label="Delete this donation permanently"
        >
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-red-800">Delete permanently</h2>

              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-card p-1.5 text-ink-500 hover:bg-ink-100"
                aria-label="Close"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            {/* ---------- the record, in full ---------- */}
            <dl className="mt-4 grid grid-cols-1 gap-2 rounded-card border border-ink-200 bg-ink-50/60 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Amount</dt>
                <dd className="font-bold text-ink-900">{formatMoney(donation.amount)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Donor</dt>
                <dd className="text-ink-800">{donation.donorName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Cause</dt>
                <dd className="text-ink-800">{donation.purpose ?? 'General donation'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Date</dt>
                <dd className="text-ink-800">{donation.receivedOn.slice(0, 10)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Reference
                </dt>
                <dd className="break-all font-mono text-xs text-ink-700">{donation.id}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <Alert tone="error">
                This action will permanently delete this donation and its eligible related records. This
                action cannot be undone.
              </Alert>
            </div>

            <ul className="mt-3 space-y-1.5 text-xs text-ink-600">
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                The record and the notifications that point at it are removed.
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                {donation.hasReceipt
                  ? 'Its receipt picture is removed from storage, unless another record still uses it.'
                  : 'There is no receipt picture attached.'}
              </li>
              <li className="flex items-start gap-2">
                <Icon name="close" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700" />
                The donor&apos;s account, their other donations and the member fund are not touched.
              </li>
            </ul>

            <div className="mt-4">
              <label htmlFor="delete-reason" className="block text-sm font-medium text-ink-700">
                Reason (optional)
              </label>
              <input
                id="delete-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={160}
                placeholder="For example: test entry"
                className="mt-1.5 w-full rounded-card border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <p className="mt-1 text-xs text-ink-500">Kept in the activity log with your name.</p>
            </div>

            <div className="mt-4">
              <label htmlFor="delete-word" className="block text-sm font-medium text-ink-700">
                Type <span className="font-mono font-bold text-red-700">DELETE</span> to confirm
              </label>
              <input
                id="delete-word"
                value={word}
                onChange={(event) => setWord(event.target.value)}
                autoComplete="off"
                placeholder="DELETE"
                className="mt-1.5 w-full rounded-card border border-ink-300 bg-white px-3 py-2 font-mono text-sm uppercase tracking-wider text-ink-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            {problem ? (
              <div className="mt-3">
                <Alert tone="error">{problem}</Alert>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy || word.trim().toUpperCase() !== 'DELETE'}
                className="btn btn-sm bg-red-700 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Icon name="refresh" className="h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Icon name="trash" className="h-4 w-4" />
                    Delete permanently
                  </>
                )}
              </button>

              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
