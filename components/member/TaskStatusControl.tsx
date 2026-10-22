// ========================================
// MEMBER PANEL - TASK STATUS BUTTONS
// ========================================
// Lets a member move their own task between
//   To do  ->  In progress  ->  Done
//
// The server checks that the task really belongs to this member before saving
// (see app/api/member/tasks/[id]/route.ts). A member cannot update somebody
// else's task, and cannot edit the task title or description.
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { TASK_STATUS_OPTIONS } from '@/lib/constants';

export function TaskStatusControl({
  taskId,
  currentStatus,
  canUpdate = true,
}: {
  taskId: string;
  currentStatus: string;
  /**
   * Whether the office allows members to record their own progress
   * (Admin Panel -> Settings -> Members). When it does not, the buttons are not
   * drawn at all - and the API refuses the request anyway.
   */
  canUpdate?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);

  if (!canUpdate) {
    return (
      <p className="text-xs text-ink-500">Progress on this task is recorded by the office.</p>
    );
  }

  async function updateStatus(nextStatus: string) {
    if (nextStatus === status || busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/member/tasks/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setError(
          (payload && 'error' in payload && payload.error) ||
            'Could not update the task. Please try again.',
        );
        return;
      }

      setStatus(nextStatus);
      // Refresh the server-rendered parts of the page so the counts update.
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {TASK_STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={busy}
            onClick={() => updateStatus(option.value)}
            aria-pressed={status === option.value}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors disabled:opacity-60',
              status === option.value
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-ink-600 ring-ink-300 hover:bg-ink-50',
            )}
          >
            {status === option.value ? <Icon name="check" className="h-3.5 w-3.5" /> : null}
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-2 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
