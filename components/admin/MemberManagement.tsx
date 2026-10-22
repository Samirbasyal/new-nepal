'use client';

// ========================================
// ADMIN PANEL - MEMBER MANAGEMENT
// ========================================
// The working screen behind  Admin Panel -> Member management.
//
// ONE ROW = ONE MEMBER, and everything the office needs to know about them:
// post, working area, how many permanent duties they carry, what happened to
// this month's tasks, and the score and rank they were given for this month.
//
// WHERE THE RULES LIVE
//   Nowhere in this file. Every button calls an API route, and every route asks
//   the server who is signed in (requireAdminApi) before it touches a row. Hiding
//   a button here is convenience, never protection.
//
// PERMANENT DUTIES vs MONTHLY TASKS
//   They are two different things and the screen keeps them apart: the duties
//   column counts permanent responsibilities (no deadline, no expiry), the tasks
//   column counts this month's work (pending / in progress / done).
// ========================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { TextField } from '@/components/forms/Field';
import { MEMBERSHIP_STATUS_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { MemberManagementRow } from '@/lib/members/service';

type Props = {
  rows: MemberManagementRow[];
  positions: string[];
  filters: {
    q: string;
    position: string;
    area: string;
    status: string;
    sort: string;
  };
  page: number;
  pages: number;
  total: number;
  month: string;
};

/** "2026-10" -> "October 2026" */
function monthLabel(month: string): string {
  const [year, value] = month.split('-').map(Number);
  if (!year || !value) return month;
  return new Date(year, value - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function joined(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** The four states a member's month can be in, in one short phrase. */
function taskSummary(row: MemberManagementRow): string {
  const total = row.tasksTodo + row.tasksInProgress + row.tasksDone;
  if (total === 0) return 'No tasks this month';
  const parts: string[] = [];
  if (row.tasksTodo) parts.push(`${row.tasksTodo} pending`);
  if (row.tasksInProgress) parts.push(`${row.tasksInProgress} in progress`);
  if (row.tasksDone) parts.push(`${row.tasksDone} done`);
  return parts.join(' · ');
}

export function MemberManagement({ rows, positions, filters, page, pages, total, month }: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState<MemberManagementRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<MemberManagementRow | null>(null);
  const [query, setQuery] = useState(filters.q);

  // Keeps the search box honest when the URL changes (back button, cleared filter).
  useEffect(() => setQuery(filters.q), [filters.q]);

  // ---------- activate / deactivate ----------
  async function toggleActive(row: MemberManagementRow) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/members/${row.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload || payload.ok === false) {
        setError((payload && 'error' in payload && payload.error) || 'Could not change the account.');
        return;
      }

      setNotice(row.isActive ? `${row.name}'s account is now deactivated.` : `${row.name}'s account is now active.`);
      setConfirming(null);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error && !editing ? <Alert tone="error">{error}</Alert> : null}

      {/* ========================================
          SEARCH / FILTER / SORT
          ======================================== */}
      {/*
        A plain GET form: the filters live in the address bar, so a filtered list
        can be bookmarked, refreshed and shared, and the server does the work.
      */}
      <form method="get" className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-ink-600" htmlFor="member-search">
              Search
            </label>
            <input
              id="member-search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input"
              placeholder="Name, phone, email or member ID"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-ink-600" htmlFor="member-position">
              Position
            </label>
            <select id="member-position" name="position" defaultValue={filters.position} className="input">
              <option value="">Any position</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-ink-600" htmlFor="member-area">
              Working area
            </label>
            <input
              id="member-area"
              name="area"
              defaultValue={filters.area}
              className="input"
              placeholder="e.g. Ward 3"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-ink-600" htmlFor="member-status">
              Status
            </label>
            <select id="member-status" name="status" defaultValue={filters.status} className="input">
              <option value="">Any status</option>
              {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-ink-600" htmlFor="member-sort">
              Sort by
            </label>
            <select id="member-sort" name="sort" defaultValue={filters.sort} className="input">
              <option value="name">Name (A-Z)</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="score">Performance score</option>
              <option value="rank">Ranking</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm">
            <Icon name="search" className="h-4 w-4" />
            Apply
          </Button>
          <Link href="/admin/member-management" className="btn btn-outline btn-sm">
            Clear
          </Link>
          <Link href="/admin/members" className="btn btn-outline btn-sm ml-auto">
            <Icon name="user-plus" className="h-4 w-4" />
            Add a member account
          </Link>
        </div>
      </form>

      {/* ========================================
          THE TABLE
          ======================================== */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">
            {total} {total === 1 ? 'member' : 'members'}
            <span className="ml-2 text-xs font-normal text-ink-500">
              scored for {monthLabel(month)}
            </span>
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="users"
              title="No members match these filters"
              description="Try a different search, or clear the filters to see everybody."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Position</th>
                  <th className="px-4 py-3 font-semibold">Working area</th>
                  <th className="px-4 py-3 text-center font-semibold">Duties</th>
                  <th className="px-4 py-3 font-semibold">This month&apos;s tasks</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Rank</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/member-management/${row.id}`}
                        className="font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {row.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {row.membershipNo ? `ID ${row.membershipNo}` : 'No member ID'} · joined{' '}
                        {joined(row.joinedAt)}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-ink-700">
                      <p className="text-xs">{row.email}</p>
                      <p className="text-xs text-ink-500">{row.phone ?? 'No phone'}</p>
                    </td>

                    <td className="px-4 py-3 text-ink-700">{row.designation ?? '-'}</td>
                    <td className="px-4 py-3 text-ink-700">{row.workingArea ?? '-'}</td>

                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                        {row.responsibilityCount}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-ink-600">{taskSummary(row)}</td>

                    <td className="px-4 py-3">
                      {row.score === null ? (
                        <span className="text-xs text-ink-400">Not evaluated</span>
                      ) : (
                        <span className="font-semibold text-ink-900">{row.score.toFixed(1)}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.rank === null ? (
                        <span className="text-xs text-ink-400">-</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
                          <Icon name="award" className="h-4 w-4 text-accent-500" />
                          {row.rank}
                        </span>
                      )}
                      {!row.evaluationPublished && row.score !== null ? (
                        <p className="text-[11px] text-amber-600">draft</p>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                      {!row.isActive ? (
                        <p className="mt-1 text-[11px] font-semibold text-red-600">sign-in blocked</p>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs">
                        <Link
                          href={`/admin/member-management/${row.id}?tab=duties`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          Responsibilities
                        </Link>
                        <Link
                          href={`/admin/member-management/${row.id}?tab=tasks`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          Monthly tasks
                        </Link>
                        <Link
                          href={`/admin/member-management/${row.id}?tab=performance`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          Evaluate
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(row)}
                            className="rounded border border-ink-300 px-2 py-0.5 font-medium text-ink-700 hover:border-brand-500 hover:text-brand-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(row)}
                            className={cn(
                              'rounded border px-2 py-0.5 font-medium',
                              row.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-brand-300 text-brand-700 hover:bg-brand-50',
                            )}
                          >
                            {row.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---------- pages ---------- */}
        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3 text-sm">
            <p className="text-xs text-ink-500">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <PageLink filters={filters} page={page - 1} disabled={page <= 1}>
                Previous
              </PageLink>
              <PageLink filters={filters} page={page + 1} disabled={page >= pages}>
                Next
              </PageLink>
            </div>
          </div>
        ) : null}
      </div>

      {/* ========================================
          EDIT MEMBER (modal)
          ======================================== */}
      {editing ? (
        <EditMemberModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
            router.refresh();
          }}
        />
      ) : null}

      {/* ========================================
          CONFIRM ACTIVATE / DEACTIVATE
          ======================================== */}
      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-ink-900">
              {confirming.isActive ? 'Deactivate this account?' : 'Activate this account?'}
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              {confirming.isActive
                ? `${confirming.name} will not be able to sign in until you activate the account again. Their records, tasks and responsibilities are kept.`
                : `${confirming.name} will be able to sign in again straight away.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant={confirming.isActive ? 'danger' : 'primary'}
                onClick={() => toggleActive(confirming)}
                disabled={busy}
              >
                {busy ? 'Saving...' : confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ========================================
// PAGE LINK
// ========================================
function PageLink({
  filters,
  page,
  disabled,
  children,
}: {
  filters: Props['filters'];
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.position) query.set('position', filters.position);
  if (filters.area) query.set('area', filters.area);
  if (filters.status) query.set('status', filters.status);
  if (filters.sort) query.set('sort', filters.sort);
  query.set('page', String(page));

  if (disabled) {
    return <span className="btn btn-outline btn-sm pointer-events-none opacity-40">{children}</span>;
  }
  return (
    <Link href={`/admin/member-management?${query.toString()}`} className="btn btn-outline btn-sm">
      {children}
    </Link>
  );
}

// ========================================
// EDIT MEMBER
// ========================================
// Only the six fields that belong to the PERSON. Passwords, roles and
// verification stay on the Members screen, so this small form cannot be used to
// quietly promote somebody to administrator.
function EditMemberModal({
  row,
  onClose,
  onSaved,
}: {
  row: MemberManagementRow;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(row.name);
  const [phone, setPhone] = useState(row.phone ?? '');
  const [designation, setDesignation] = useState(row.designation ?? '');
  const [workingArea, setWorkingArea] = useState(row.workingArea ?? '');
  const [status, setStatus] = useState(row.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch(`/api/admin/members/${row.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          designation,
          workingArea,
          status,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | { ok: false; error: string; fields?: Record<string, string> }
        | null;

      if (!response.ok || !payload || payload.ok === false) {
        setError((payload && 'error' in payload && payload.error) || 'Could not save the changes.');
        if (payload && 'fields' in payload && payload.fields) setFieldErrors(payload.fields);
        return;
      }

      onSaved(`${name}'s details were saved.`);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <form onSubmit={save} className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink-900">Edit member</h2>
            <p className="mt-1 text-xs text-ink-500">
              {row.email} · permanent duties are edited in the member&apos;s file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Full name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={fieldErrors.name}
            className="sm:col-span-2"
          />
          <TextField
            label="Phone number"
            name="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={fieldErrors.phone}
          />
          <div>
            <label className="label" htmlFor="edit-status">
              Membership status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="input"
            >
              {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label="Post / position"
            name="designation"
            placeholder="President, Secretary, Treasurer, General Member..."
            value={designation}
            onChange={(event) => setDesignation(event.target.value)}
            error={fieldErrors.designation}
          />
          <TextField
            label="Working area"
            name="workingArea"
            placeholder="e.g. Ward 3 - education"
            value={workingArea}
            onChange={(event) => setWorkingArea(event.target.value)}
            error={fieldErrors.workingArea}
          />
        </div>

        <p className="mt-3 text-xs text-ink-500">
          Email addresses, passwords and administrator roles are changed on the{' '}
          <Link href="/admin/members" className="font-medium text-brand-700 hover:underline">
            Members
          </Link>{' '}
          screen.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
