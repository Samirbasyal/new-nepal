// ========================================
// ADMIN PANEL - VERIFY OR REJECT A DONATION
// ========================================
// One small panel per donation that is waiting. It is used on /admin/donations
// in the "Waiting for verification" list.
//
// WHY IT IS A SEPARATE COMPONENT
//   The fund payments use a different endpoint (/api/admin/fund/decisions) and
//   different rules (a member is notified, the monthly total is recalculated).
//   A donation has no member behind it, so it gets its own two buttons and its
//   own route rather than a pile of "if it is a donation" checks inside the
//   fund panel.
//
// WAITING AND MISTAKES
//   The button that is working is disabled and says what it is doing, so a
//   double click cannot record the same decision twice. A rejection asks for a
//   reason first, because the office has to be able to explain it later.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

export function DonationDecisionPanel({
  donationId,
  donorName,
}: {
  donationId: string;
  donorName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'VERIFY' | 'REJECT' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function decide(action: 'VERIFY' | 'REJECT') {
    setProblem(null);
    setDone(null);

    if (action === 'REJECT' && reason.trim().length < 3) {
      setProblem('Please write why it is being rejected (at least 3 characters).');
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
      setShowReject(false);
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

      {showReject ? (
        <div>
          <label className="block text-sm font-medium text-ink-700" htmlFor={`reason-${donationId}`}>
            Why is this donation being rejected?
          </label>
          <textarea
            id={`reason-${donationId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="input mt-1.5"
            placeholder="For example: no such transfer was received in the bank account."
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

        {showReject ? (
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
                setShowReject(false);
                setProblem(null);
              }}
              disabled={busy !== null}
              className="btn btn-outline btn-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={busy !== null}
            className="btn btn-outline btn-sm"
          >
            <Icon name="close" className="h-4 w-4" />
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
