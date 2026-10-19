// ========================================
// ADMIN PANEL - "CREATE THIS MONTH" BUTTON
// ========================================
// The small form above the monthly tracking table.
//
// It asks the server to create one monthly row for every active member:
//
//     POST /api/admin/fund/contributions
//     { action-less: periodMonth: "2026-10", requiredAmount: 1000, includeExisting: false }
//
// WHY A CONFIRMATION STEP
//   Creating a month touches every member, so the button asks first. Members
//   who already have a row are skipped (their payments must never be
//   overwritten) unless the administrator ticks the box.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';

export function GenerateMonthButton({
  month,
  defaultAmount,
}: {
  month: string;
  defaultAmount: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [includeExisting, setIncludeExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/fund/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodMonth: month,
          requiredAmount: amount,
          includeExisting,
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.ok) {
        setError(json?.error ?? 'The month could not be created.');
        return;
      }

      setSuccess(json.message ?? 'The month was created.');
      setOpen(false);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {success ? <Alert tone="success">{success}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="button" variant="primary" size="sm" onClick={() => setOpen(true)}>
          <Icon name="plus" className="h-4 w-4" />
          Create this month
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-card border border-ink-200 bg-ink-50 p-4">
      <p className="text-sm font-semibold text-ink-900">
        Create one row for every active member
      </p>

      <label className="block">
        <span className="label">Monthly amount for this run</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="input"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={includeExisting}
          onChange={(event) => setIncludeExisting(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ink-300"
        />
        Also update the required amount for members who already have this month
      </label>

      <p className="text-xs text-ink-500">
        Payments that are already recorded are never changed by this action.
      </p>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" disabled={busy} onClick={generate}>
          {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Yes, create it'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
