// ========================================
// ADMIN PANEL - VERIFY, REJECT OR ASK A DONATION
// ========================================
// One small panel per donation that is waiting. It is used on /admin/donations
// in the "Waiting to be checked" list.
//
// THE THREE DECISIONS
//   Verify            the money is in the account -> VERIFIED, counted as income
//   Reject            it is not -> REJECTED, never counted, a reason is required
//   Need more info    something is unclear -> stays PENDING with INFO_REQUIRED...
//
//   The third one is not "reject but softer". It keeps the donation in the queue
//   so it cannot be forgotten, and it stores the question in "remarks" so the
//   donor's own status page can show exactly what the office is asking for.
//
// WHY IT IS A SEPARATE COMPONENT
//   Fund payments use /api/admin/fund/decisions and different rules (a member is
//   notified, the monthly total is recalculated). A donation has no member behind
//   it, so it gets its own route rather than a pile of "if it is a donation"
//   checks inside the fund panel.
//
// WAITING AND MISTAKES
//   The button that is working is disabled and says what it is doing, so a double
//   click cannot record the same decision twice. Rejecting and asking for more
//   information both require a written reason, because the office has to be able
//   to explain the decision later.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

type Action = 'VERIFY' | 'REJECT' | 'INFO_REQUIRED';

/** The two actions that need a written reason before they can be sent. */
type Reasoned = 'REJECT' | 'INFO_REQUIRED';

export function DonationDecisionPanel({
  donationId,
  donorName,
}: {
  donationId: string;
  donorName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [reasonFor, setReasonFor] = useState<Reasoned | null>(null);
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function openReason(which: Reasoned) {
    setReasonFor(which);
    setReason('');
    setProblem(null);
    setDone(null);
  }

  async function decide(action: Action) {
    setProblem(null);
    setDone(null);

    const needsReason = action === 'REJECT' || action === 'INFO_REQUIRED';

    if (needsReason && reason.trim().length < 3) {
      setProblem(
        action === 'REJECT'
          ? 'Please write why it is being rejected (at least 3 characters).'
          : 'Please write what you need from the donor (at least 3 characters).',
      );
      return;
    }

    setBusy(action);

    try {
      const response = await fetch('/api/admin/donations/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: donationId, action, remarks: reason.trim() || null }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'The decision could not be saved. Please try again.');
        return;
      }

      setDone(payload.message ?? 'Saved.');
      // Refresh the page so the cards and the lists are up to date.
      router.refresh();
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setBusy(null);
      setReasonFor(null);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {problem ? (
        <p className="rounded-card border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">
          {problem}
        </p>
      ) : null}

      {done ? (
        <p className="rounded-card border border-green-200 bg-green-50 p-2.5 text-sm text-green-800">
          {done}
        </p>
      ) : null}

      {reasonFor ? (
        <div>
          <label className="block text-sm font-medium text-ink-700" htmlFor={`reason-${donationId}`}>
            {reasonFor === 'REJECT'
              ? 'Why is this donation being rejected?'
              : 'What do you need from the donor?'}
          </label>
          <textarea
            id={`reason-${donationId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="input mt-1.5"
            placeholder={
              reasonFor === 'REJECT'
                ? 'For example: no such transfer was received in the bank account.'
                : 'For example: the receipt is unclear - please send a full screenshot showing the transaction ID.'
            }
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void decide('VERIFY')}
          disabled={busy !== null}
          className="btn btn-primary btn-sm"
          title={`Confirm that the money from ${donorName} really arrived`}
        >
          {busy === 'VERIFY' ? (
            <>
              <Icon name="refresh" className="h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              <Icon name="check-circle" className="h-4 w-4" />
              Verify
            </>
          )}
        </button>

        {reasonFor === 'REJECT' ? (
          <>
            <button
              type="button"
              onClick={() => void decide('REJECT')}
              disabled={busy !== null}
              className="btn btn-outline btn-sm text-red-700"
            >
              {busy === 'REJECT' ? (
                <>
                  <Icon name="refresh" className="h-4 w-4 animate-spin" />
                  Rejecting…
                </>
              ) : (
                <>
                  <Icon name="close" className="h-4 w-4" />
                  Confirm rejection
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setReasonFor(null);
                setProblem(null);
              }}
              disabled={busy !== null}
              className="btn btn-outline btn-sm"
            >
              Cancel
            </button>
          </>
        ) : null}

        {reasonFor === 'INFO_REQUIRED' ? (
          <>
            <button
              type="button"
              onClick={() => void decide('INFO_REQUIRED')}
              disabled={busy !== null}
              className="btn btn-outline btn-sm"
            >
              {busy === 'INFO_REQUIRED' ? (
                <>
                  <Icon name="refresh" className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Icon name="mail" className="h-4 w-4" />
                  Confirm request
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setReasonFor(null);
                setProblem(null);
              }}
              disabled={busy !== null}
              className="btn btn-outline btn-sm"
            >
              Cancel
            </button>
          </>
        ) : null}

        {reasonFor === null ? (
          <>
            <button
              type="button"
              onClick={() => openReason('INFO_REQUIRED')}
              disabled={busy !== null}
              className="btn btn-outline btn-sm"
              title="Keep it waiting and ask the donor for something"
            >
              <Icon name="mail" className="h-4 w-4" />
              Need more info
            </button>

            <button
              type="button"
              onClick={() => openReason('REJECT')}
              disabled={busy !== null}
              className="btn btn-outline btn-sm"
            >
              <Icon name="close" className="h-4 w-4" />
              Reject
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
