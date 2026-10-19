// ========================================
// MEMBER PANEL - COMMITTEE DUTIES
// ========================================
// The cards under "Your Role & Responsibilities".
//
// A member can move a duty forward (Pending -> In progress -> Completed) but
// cannot edit its words, its deadline or its instructions - those belong to the
// office. The server enforces the same rule, so hiding a button is not what
// protects it.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export type MemberDuty = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  deadline: string | null;
  status: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 ring-green-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DutyList({ duties, postTitle }: { duties: MemberDuty[]; postTitle: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(duty: MemberDuty, status: 'IN_PROGRESS' | 'COMPLETED') {
    setBusyId(duty.id);
    setError(null);

    try {
      const response = await fetch(`/api/member/duties/${duty.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'That could not be saved. Please try again.');
        return;
      }

      // Re-read from the server so the page shows exactly what the database has.
      router.refresh();
    } catch {
      setError('The website could not be reached. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (duties.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Icon name="check-circle" className="mx-auto h-8 w-8 text-ink-300" />
        <p className="mt-3 font-semibold text-ink-800">
          No responsibilities have been given to you yet
        </p>
        <p className="mt-1 text-sm text-ink-500">
          Your post is <strong>{postTitle}</strong>. The office adds duties from Admin Panel →
          Committee responsibilities, and they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <ul className="space-y-3">
        {duties.map((duty) => {
          const deadline = formatDate(duty.deadline);
          const overdue =
            duty.status !== 'COMPLETED' && duty.deadline
              ? new Date(duty.deadline).getTime() < Date.now()
              : false;

          return (
            <li key={duty.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-ink-900">{duty.title}</h3>

                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset',
                    STATUS_STYLES[duty.status] ?? 'bg-ink-100 text-ink-700 ring-ink-200',
                  )}
                >
                  {STATUS_LABELS[duty.status] ?? duty.status}
                </span>
              </div>

              {duty.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
                  {duty.description}
                </p>
              ) : null}

              {duty.instructions ? (
                <div className="mt-3 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
                    <Icon name="lock" className="h-3.5 w-3.5" />
                    Private instruction
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">
                    {duty.instructions}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                {deadline ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      overdue && 'font-semibold text-red-600',
                    )}
                  >
                    <Icon name="calendar" className="h-3.5 w-3.5" />
                    Deadline {deadline}
                    {overdue ? ' · overdue' : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="calendar" className="h-3.5 w-3.5" />
                    No deadline
                  </span>
                )}
              </div>

              {duty.status !== 'COMPLETED' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {duty.status === 'PENDING' ? (
                    <button
                      type="button"
                      onClick={() => setStatus(duty, 'IN_PROGRESS')}
                      disabled={busyId === duty.id}
                      className="inline-flex items-center gap-2 rounded-btn border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-60"
                    >
                      {busyId === duty.id ? (
                        <span className="inline-flex items-center gap-2 text-accent-600" role="status">
                          <Icon name="refresh" className="h-4 w-4 animate-spin" />
                          Please wait…
                        </span>
                      ) : (
                        <>
                          <Icon name="activity" className="h-4 w-4" />
                          Start working
                        </>
                      )}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setStatus(duty, 'COMPLETED')}
                    disabled={busyId === duty.id}
                    className="inline-flex items-center gap-2 rounded-btn bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {busyId === duty.id ? (
                      <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                        <Icon name="refresh" className="h-4 w-4 animate-spin" />
                        Please wait…
                      </span>
                    ) : (
                      <>
                        <Icon name="check" className="h-4 w-4" />
                        Mark completed
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
