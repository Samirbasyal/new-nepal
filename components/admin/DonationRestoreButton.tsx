// ========================================
// ADMIN PANEL - PUT A REMOVED DONATION BACK
// ========================================
// One button, one request. Removing a donation is a soft delete, so restoring it
// is simply isDeleted = false: the original amount, dates, receipt and history
// all come back exactly as they were.
//
// The button and the API both require an administrator; hiding the button is a
// convenience, the refusal happens on the server.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

export function DonationRestoreButton({
  donationId,
  donorName,
}: {
  donationId: string;
  donorName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function restore() {
    const sure = window.confirm(
      `Put this donation back into the totals?\n\n${donorName}\n\nIt will count again exactly as it did before.`,
    );

    if (!sure) return;

    setBusy(true);
    setProblem(null);

    try {
      const response = await fetch('/api/admin/donations/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: donationId }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'The donation could not be restored. Please try again.');
        return;
      }

      router.refresh();
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {problem ? <p className="mb-2 text-xs font-medium text-red-700">{problem}</p> : null}

      <button
        type="button"
        onClick={() => void restore()}
        disabled={busy}
        className="btn btn-outline btn-sm"
      >
        <Icon name={busy ? 'refresh' : 'refresh'} className={busy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Restore'}
      </button>
    </div>
  );
}
