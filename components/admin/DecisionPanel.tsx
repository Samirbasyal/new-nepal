// ========================================
// ADMIN PANEL - APPROVE / REJECT PANEL
// ========================================
// The buttons an administrator uses to verify a fund payment or to decide on
// an expense.
//
// WHERE THE REAL DECISION IS MADE
//   Not here. This component only sends the request to
//   POST /api/admin/fund/decisions, which checks the administrator's role,
//   runs the change inside a database transaction and writes the audit line.
//
// WHY REJECTING ASKS FOR A REASON
//   The member sees the reason in their notification and in their payment
//   history, so it must be filled in. The server refuses an empty reason too.
//
// EXPENSE APPROVAL IS SUPER-ADMIN ONLY
//   When "requireSuperAdmin" is true the buttons are shown as disabled with an
//   explanation, and the server independently refuses the request. The
//   disabled button is only a courtesy - the server is what protects it.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';

export function DecisionPanel({
  recordId,
  type,
  recordLabel,
  canDecide = true,
  needsSuperAdmin = false,
  isSuperAdmin = false,
  compact = false,
}: {
  recordId: string;
  type: 'payment' | 'expense';
  /** A short description used in the confirmation message. */
  recordLabel: string;
  /** False when the record is not in a decidable state any more. */
  canDecide?: boolean;
  /** True for expenses (Super Administrator only). */
  needsSuperAdmin?: boolean;
  /** Whether the signed-in administrator IS a Super Administrator. */
  isSuperAdmin?: boolean;
  /** Compact mode hides the extra spacing (used inside tables). */
  compact?: boolean;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  const blocked = needsSuperAdmin && !isSuperAdmin;

  async function decide(action: 'approve' | 'reject' | 'cancel') {
    setError(null);
    setSuccess(null);

    if (action !== 'approve' && note.trim().length < 3) {
      setError('Please write a short reason (at least 3 characters).');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch('/api/admin/fund/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id: recordId, action, note: note.trim() || null }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.ok) {
        setError(json?.error ?? 'The action could not be completed.');
        return;
      }

      setSuccess(json.message ?? 'Done.');
      setRejecting(false);
      setNote('');

      // Refresh the server data so the tables and totals update immediately.
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className={compact ? '' : 'pt-1'}>
        <Alert tone="success">{success}</Alert>
      </div>
    );
  }

  if (blocked) {
    return (
      <p className="flex items-start gap-2 text-xs text-amber-800">
        <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Only a Super Administrator may approve an expense.
      </p>
    );
  }

  if (!canDecide) {
    return <span className="text-xs text-ink-400">Already decided</span>;
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {rejecting ? (
        <div className="space-y-2">
          <label className="label" htmlFor={`note-${recordId}`}>
            Reason for rejecting {recordLabel}
          </label>
          <textarea
            id={`note-${recordId}`}
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="input"
            placeholder="For example: the transaction ID could not be found in our bank statement."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => decide('reject')}
            >
              {busy ? 'Saving…' : 'Confirm rejection'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setRejecting(false);
                setNote('');
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={() => decide('approve')}
          >
            <Icon name="check" className="h-4 w-4" />
            {busy ? 'Saving…' : 'Approve'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            <Icon name="close" className="h-4 w-4" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
