// ========================================
// ADMIN PANEL - MEMBER REGISTRATION REQUESTS (SCREEN)
// ========================================
// The working screen for the join-up queue: search, filter, sort, open, edit,
// approve, reject, delete - and the activation link when no email could be sent.
//
// WHERE THE RULES LIVE
//   Nowhere in this file. Every button below calls an API route, and every API
//   route asks the server who is signed in (requireAdminApi) before it does
//   anything. This component only decides what to SHOW. If somebody hid a button
//   with the browser's developer tools, the action would still be refused.
//
// WHY THERE ARE CONFIRMATION DIALOGS
//   Approving creates a link that can make somebody a member, and deleting throws
//   an application away for good. Both are one click away from a mis-click in a
//   table, so both ask first - in the page itself, not with the browser's grey
//   "OK/Cancel" box, so the applicant's name is in the question.
//
// LIVE COUNT
//   The menu badge and this header poll /pending-count every 25 seconds. When the
//   number changes, the list refreshes itself once - unless a dialog is open, in
//   which case the refresh waits so nobody loses what they were typing.
// ========================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { NepaliDateField } from '@/components/ui/NepaliDateField';
import { TextField, TextareaField } from '@/components/forms/Field';
import { cn } from '@/lib/utils';

export type MembershipRequestRow = {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  currentAddress: string;
  dateOfBirth: string | null;
  occupation: string | null;
  reasonForJoining: string;
  requestLetter: string;
  profilePhotoUrl: string | null;
  status: string;
  rejectionReason: string | null;
  adminNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  adminReadAt: string | null;
  activationExpiresAt: string | null;
  activationEmailSent: boolean;
  activatedAt: string | null;
  userId: string | null;
  reviewedByName: string | null;
};

type Counts = { PENDING: number; APPROVED: number; REJECTED: number; ALL: number };

type Banner = { tone: 'success' | 'error' | 'warning'; text: string } | null;

type ConfirmKind = 'approve' | 'reject' | 'delete';

// ========================================
// SMALL HELPERS
// ========================================
function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(value)}, ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/** value for <input type="date"> */
function dateInput(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All requests' },
];

export function MembershipRequestsManager({
  rows,
  counts,
  total,
  page,
  pages,
  pageSize,
  query,
  status,
  sort,
  emailConfigured,
  openId,
}: {
  rows: MembershipRequestRow[];
  counts: Counts;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  query: string;
  status: string;
  sort: string;
  emailConfigured: boolean;
  openId: string | null;
}) {
  const router = useRouter();

  const [search, setSearch] = useState(query);
  const [detailId, setDetailId] = useState<string | null>(openId);
  const [editing, setEditing] = useState<MembershipRequestRow | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; row: MembershipRequestRow } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [activation, setActivation] = useState<{ link: string; emailed: boolean; rowName: string } | null>(
    null,
  );
  const [livePending, setLivePending] = useState(counts.PENDING);
  const [copied, setCopied] = useState(false);

  const dialogOpen = Boolean(detailId || editing || confirm);
  const dialogOpenRef = useRef(dialogOpen);
  dialogOpenRef.current = dialogOpen;

  const detail = useMemo(() => rows.find((row) => row.id === detailId) ?? null, [rows, detailId]);

  // ========================================
  // KEEP THE NUMBER IN STEP WITH THE DATABASE
  // ========================================
  useEffect(() => {
    setLivePending(counts.PENDING);
  }, [counts.PENDING]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch('/api/admin/membership-requests/pending-count', {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { ok: true; data: { pending: number } };
        if (cancelled || payload.ok !== true) return;

        if (payload.data.pending !== livePending) {
          setLivePending(payload.data.pending);
          // A dialog in progress is never yanked away from under somebody.
          if (!dialogOpenRef.current) router.refresh();
        }
      } catch {
        /* offline for a moment - the next check will put it right */
      }
    };

    const timer = setInterval(check, 25000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [livePending, router]);

  // ========================================
  // NAVIGATION (search / filter / sort / page)
  // ========================================
  const buildHref = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams();
      const next = { q: query, status, sort, page: String(page), ...patch };

      if (next.q) params.set('q', String(next.q));
      if (next.status && next.status !== 'ALL') params.set('status', String(next.status));
      if (next.sort && next.sort !== 'newest') params.set('sort', String(next.sort));
      if (Number(next.page) > 1) params.set('page', String(next.page));

      const queryString = params.toString();
      return `/admin/member-requests${queryString ? `?${queryString}` : ''}`;
    },
    [query, status, sort, page],
  );

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildHref({ q: search.trim(), page: 1 }));
  }

  // ========================================
  // ACTIONS
  // ========================================
  async function callApi(
    url: string,
    init: RequestInit,
    key: string,
  ): Promise<{ ok: true; data: unknown; message?: string } | { ok: false; error: string; fields?: Record<string, string> }> {
    setBusy(key);
    setBanner(null);

    try {
      const response = await fetch(url, init);
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: unknown; message?: string }
        | { ok: false; error: string; fields?: Record<string, string> }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        const message =
          (payload && 'error' in payload && payload.error) ||
          'Something went wrong. Please try again.';
        setBanner({ tone: 'error', text: message });
        return {
          ok: false,
          error: message,
          fields: payload && 'fields' in payload ? payload.fields : undefined,
        };
      }

      return { ok: true, data: payload.data, message: payload.message };
    } catch {
      const message = 'Could not reach the server. Please check your connection and try again.';
      setBanner({ tone: 'error', text: message });
      return { ok: false, error: message };
    } finally {
      setBusy(null);
    }
  }

  async function openDetail(row: MembershipRequestRow) {
    setDetailId(row.id);
    setActivation(null);
    setCopied(false);

    // "An administrator has opened this" - only meaningful for a request that has
    // not been looked at yet, which is why the server ignores repeats.
    if (!row.adminReadAt) {
      void fetch(`/api/admin/membership-requests/${row.id}/read`, { method: 'POST' })
        .then(() => router.refresh())
        .catch(() => undefined);
    }
  }

  async function approve(row: MembershipRequestRow) {
    const result = await callApi(
      `/api/admin/membership-requests/${row.id}/decision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      },
      `approve:${row.id}`,
    );

    setConfirm(null);

    if (!result.ok) return;

    const data = result.data as { activation?: { link: string; emailed: boolean } | null };

    if (data.activation) {
      setActivation({
        link: data.activation.link,
        emailed: data.activation.emailed,
        rowName: row.fullName,
      });
    }

    setBanner({
      tone: data.activation?.emailed ? 'success' : 'warning',
      text: result.message ?? 'Approved.',
    });

    router.refresh();
  }

  async function reject(row: MembershipRequestRow) {
    const result = await callApi(
      `/api/admin/membership-requests/${row.id}/decision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', rejectionReason: rejectReason.trim() }),
      },
      `reject:${row.id}`,
    );

    setConfirm(null);
    setRejectReason('');

    if (!result.ok) return;

    setBanner({ tone: 'success', text: result.message ?? 'The request has been rejected.' });
    setDetailId(null);
    router.refresh();
  }

  async function remove(row: MembershipRequestRow) {
    const result = await callApi(
      `/api/admin/membership-requests/${row.id}`,
      { method: 'DELETE' },
      `delete:${row.id}`,
    );

    setConfirm(null);
    if (!result.ok) return;

    setBanner({ tone: 'success', text: result.message ?? 'The request has been permanently deleted.' });
    setDetailId(null);
    setActivation(null);
    router.refresh();
  }

  async function newActivation(row: MembershipRequestRow) {
    const result = await callApi(
      `/api/admin/membership-requests/${row.id}/activation`,
      { method: 'POST' },
      `activation:${row.id}`,
    );

    if (!result.ok) return;

    const data = result.data as { link: string; emailed: boolean };
    setActivation({ link: data.link, emailed: data.emailed, rowName: row.fullName });
    setBanner({ tone: data.emailed ? 'success' : 'warning', text: result.message ?? '' });
    router.refresh();
  }

  async function markAllRead() {
    const result = await callApi('/api/admin/membership-requests/read-all', { method: 'POST' }, 'read-all');
    if (!result.ok) return;
    setBanner({ tone: 'success', text: result.message ?? 'All requests marked as read.' });
    router.refresh();
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setBanner({
        tone: 'error',
        text: 'Your browser would not let the page copy the link. Please select it and copy it by hand.',
      });
    }
  }

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="mx-auto max-w-6xl">
      {/* ---------- Heading ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Member registration requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            People who have asked to join the club. Nothing here is an account yet: approving a
            request creates a private activation link, and the applicant chooses their own password.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {livePending > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              {livePending} pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 ring-1 ring-green-200">
              <Icon name="check-circle" className="h-3.5 w-3.5" />
              Nothing waiting
            </span>
          )}
        </div>
      </div>

      {/* ---------- Email warning ---------- */}
      {!emailConfigured ? (
        <div className="mt-4 flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>No email server is configured.</strong> Approval will still work, but the
            activation link cannot be emailed. The screen shows the link so you can pass it to the
            applicant yourself (phone, WhatsApp or in person). Add <code>SMTP_HOST</code>,{' '}
            <code>SMTP_USER</code> and <code>SMTP_PASSWORD</code> to send it automatically.
          </p>
        </div>
      ) : null}

      {/* ---------- Banner ---------- */}
      {banner ? (
        <div
          className={cn(
            'mt-4 flex items-start justify-between gap-3 rounded-card border p-4 text-sm',
            banner.tone === 'success' && 'border-green-200 bg-green-50 text-green-900',
            banner.tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
            banner.tone === 'error' && 'border-red-200 bg-red-50 text-red-900',
          )}
          role="status"
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="shrink-0 rounded p-1 hover:bg-black/5"
            aria-label="Dismiss"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* ---------- Activation link panel ---------- */}
      {activation ? (
        <div className="mt-4 rounded-card border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-brand-900">
                {activation.emailed
                  ? `Activation link emailed to ${activation.rowName}`
                  : `Activation link for ${activation.rowName} - NOT emailed`}
              </p>
              <p className="mt-1 text-xs text-brand-800">
                {activation.emailed
                  ? 'The applicant received this link. It works once and expires in seven days.'
                  : 'No email was sent. Copy this link and give it to the applicant yourself. It works once and expires in seven days.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivation(null)}
              className="rounded p-1 text-brand-800 hover:bg-brand-100"
              aria-label="Close"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={activation.link}
              onFocus={(event) => event.currentTarget.select()}
              className="input flex-1 bg-white font-mono text-xs"
              aria-label="Activation link"
            />
            <Button type="button" variant="primary" onClick={() => copyLink(activation.link)}>
              <Icon name={copied ? 'check' : 'link'} className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ---------- Search / filter / sort ---------- */}
      <div className="mt-5 rounded-card border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={submitSearch} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email or mobile number"
                className="input pl-9"
                aria-label="Search requests"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
            {query ? (
              <Link href={buildHref({ q: '', page: 1 })} className="text-xs font-semibold text-ink-600 hover:underline">
                Clear
              </Link>
            ) : null}
          </form>

          <label className="flex items-center gap-2 text-xs font-medium text-ink-600">
            <Icon name="filter" className="h-3.5 w-3.5" />
            Sort
            <select
              value={sort}
              onChange={(event) => router.push(buildHref({ sort: event.target.value, page: 1 }))}
              className="input w-auto py-1.5 text-xs"
              aria-label="Sort requests"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="status">By status (pending first)</option>
            </select>
          </label>

          {counts.PENDING > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              disabled={busy === 'read-all'}
              className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
            >
              Mark all as read
            </button>
          ) : null}
        </div>

        {/* ---------- Status tabs ---------- */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value || (tab.value === 'ALL' && status !== 'PENDING' && status !== 'APPROVED' && status !== 'REJECTED');
            const count = tab.value === 'ALL' ? counts.ALL : counts[tab.value as 'PENDING' | 'APPROVED' | 'REJECTED'];

            return (
              <Link
                key={tab.value}
                href={buildHref({ status: tab.value, page: 1 })}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors',
                  active
                    ? 'bg-brand-600 text-white ring-brand-600'
                    : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                    active ? 'bg-white/20' : 'bg-ink-100 text-ink-700',
                  )}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ---------- The list ---------- */}
      <div className="mt-4">
        {rows.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon="user-plus"
              title={query || status !== 'ALL' ? 'No requests match this filter' : 'No membership requests yet'}
              description={
                query || status !== 'ALL'
                  ? 'Try a different word, or choose "All requests" to see everything.'
                  : 'When somebody fills in the request form on /member/portal, their application appears here and the number on the menu goes up.'
              }
              compact
            />
          </div>
        ) : (
          <>
            {/* ---------- Desktop table ---------- */}
            <div className="hidden overflow-hidden rounded-card border border-ink-200 bg-white md:block">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Applicant</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-ink-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!row.adminReadAt && row.status === 'PENDING' ? (
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500"
                              title="Not opened yet"
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openDetail(row)}
                            className="text-left font-semibold text-ink-900 hover:text-brand-700 hover:underline"
                          >
                            {row.fullName}
                          </button>
                        </div>
                        {row.occupation ? (
                          <span className="text-xs text-ink-500">{row.occupation}</span>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <a href={`mailto:${row.email}`} className="block text-ink-700 hover:underline">
                          {row.email}
                        </a>
                        <a href={`tel:${row.mobileNumber}`} className="block text-xs text-ink-500 hover:underline">
                          {row.mobileNumber}
                        </a>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-600">
                        {formatDate(row.submittedAt)}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                        {row.activatedAt ? (
                          <span className="mt-1 block text-[11px] text-green-700">Account active</span>
                        ) : row.status === 'APPROVED' ? (
                          <span className="mt-1 block text-[11px] text-ink-500">Waiting for activation</span>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetail(row)}
                            className="rounded-btn p-2 text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                            title="View the application"
                            aria-label={`View ${row.fullName}`}
                          >
                            <Icon name="eye" className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditing(row)}
                            className="rounded-btn p-2 text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                            title="Edit the details"
                            aria-label={`Edit ${row.fullName}`}
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </button>

                          {!row.userId && row.status !== 'APPROVED' ? (
                            <button
                              type="button"
                              onClick={() => setConfirm({ kind: 'approve', row })}
                              className="rounded-btn p-2 text-green-700 hover:bg-green-50"
                              title="Approve"
                              aria-label={`Approve ${row.fullName}`}
                            >
                              <Icon name="check" className="h-4 w-4" />
                            </button>
                          ) : null}

                          {!row.userId && row.status === 'PENDING' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectReason('');
                                setConfirm({ kind: 'reject', row });
                              }}
                              className="rounded-btn p-2 text-amber-700 hover:bg-amber-50"
                              title="Reject"
                              aria-label={`Reject ${row.fullName}`}
                            >
                              <Icon name="close" className="h-4 w-4" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => setConfirm({ kind: 'delete', row })}
                            className="rounded-btn p-2 text-red-600 hover:bg-red-50"
                            title="Delete permanently"
                            aria-label={`Delete ${row.fullName}`}
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---------- Mobile cards ---------- */}
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <div key={row.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900">{row.fullName}</p>
                      <p className="truncate text-xs text-ink-600">{row.email}</p>
                      <p className="text-xs text-ink-500">{row.mobileNumber}</p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <p className="mt-2 text-xs text-ink-500">Submitted {formatDate(row.submittedAt)}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openDetail(row)} className="btn btn-outline btn-sm">
                      <Icon name="eye" className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button type="button" onClick={() => setEditing(row)} className="btn btn-outline btn-sm">
                      <Icon name="edit" className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    {!row.userId && row.status !== 'APPROVED' ? (
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: 'approve', row })}
                        className="btn btn-primary btn-sm"
                      >
                        <Icon name="check" className="h-3.5 w-3.5" />
                        Approve
                      </button>
                    ) : null}
                    {!row.userId && row.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRejectReason('');
                          setConfirm({ kind: 'reject', row });
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        Reject
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: 'delete', row })}
                      className="btn btn-outline btn-sm text-red-600"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------- Pagination ---------- */}
      {pages > 1 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink-200 bg-white px-4 py-3 text-sm">
          <p className="text-xs text-ink-600">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>

          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link href={buildHref({ page: page - 1 })} className="btn btn-outline btn-sm">
                <Icon name="chevron-left" className="h-4 w-4" />
                Previous
              </Link>
            ) : (
              <span className="btn btn-outline btn-sm opacity-40">
                <Icon name="chevron-left" className="h-4 w-4" />
                Previous
              </span>
            )}

            <span className="px-2 text-xs font-semibold text-ink-700">
              Page {page} of {pages}
            </span>

            {page < pages ? (
              <Link href={buildHref({ page: page + 1 })} className="btn btn-outline btn-sm">
                Next
                <Icon name="chevron-right" className="h-4 w-4" />
              </Link>
            ) : (
              <span className="btn btn-outline btn-sm opacity-40">
                Next
                <Icon name="chevron-right" className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* ========================================
          DETAIL DIALOG
          ======================================== */}
      {detail ? (
        <Modal onClose={() => setDetailId(null)} label={`Application from ${detail.fullName}`}>
          <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-ink-900">{detail.fullName}</h2>
              <p className="text-xs text-ink-500">
                Submitted {formatDateTime(detail.submittedAt)} · <StatusBadge status={detail.status} />
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailId(null)}
              className="rounded-btn p-1.5 text-ink-500 hover:bg-ink-100"
              aria-label="Close"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-ink-400 ring-1 ring-ink-200">
                {detail.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.profilePhotoUrl}
                    alt={detail.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon name="user" className="h-7 w-7" />
                )}
              </span>

              <dl className="grid flex-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-500">Email</dt>
                  <dd className="break-all text-ink-800">{detail.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-500">Mobile</dt>
                  <dd className="text-ink-800">{detail.mobileNumber}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-500">Date of birth</dt>
                  <dd className="text-ink-800">{formatDate(detail.dateOfBirth)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-500">Occupation</dt>
                  <dd className="text-ink-800">{detail.occupation || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] uppercase tracking-wide text-ink-500">Current address</dt>
                  <dd className="text-ink-800">{detail.currentAddress}</dd>
                </div>
              </dl>
            </div>

            <section className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">
                Reason for joining
              </h3>
              <p className="mt-1 rounded-card bg-ink-50 p-3 text-sm text-ink-800">
                {detail.reasonForJoining}
              </p>
            </section>

            <section className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Request letter</h3>
              <p className="mt-1 whitespace-pre-wrap rounded-card border border-ink-200 p-3 text-sm leading-relaxed text-ink-800">
                {detail.requestLetter}
              </p>
            </section>

            {detail.adminNote ? (
              <section className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">
                  Internal note (not shown to the applicant)
                </h3>
                <p className="mt-1 rounded-card bg-amber-50 p-3 text-sm text-amber-900">
                  {detail.adminNote}
                </p>
              </section>
            ) : null}

            {detail.rejectionReason ? (
              <section className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">
                  Reason for rejection
                </h3>
                <p className="mt-1 rounded-card bg-red-50 p-3 text-sm text-red-900">
                  {detail.rejectionReason}
                </p>
              </section>
            ) : null}

            {/* ---------- What happened, and what is left ---------- */}
            <section className="mt-5 rounded-card border border-ink-200 p-3 text-xs text-ink-600">
              {detail.userId ? (
                <p className="flex items-center gap-1.5 text-green-700">
                  <Icon name="check-circle" className="h-3.5 w-3.5" />
                  Account activated {formatDate(detail.activatedAt)}. Manage the person in{' '}
                  <Link href="/admin/members" className="font-semibold underline">
                    Members
                  </Link>
                  .
                </p>
              ) : detail.status === 'APPROVED' ? (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    Approved {formatDate(detail.reviewedAt)}
                    {detail.reviewedByName ? ` by ${detail.reviewedByName}` : ''}. Waiting for the
                    applicant to open the activation link.
                  </p>
                  <p>
                    Link expires {formatDateTime(detail.activationExpiresAt)}. Last attempt to send:{' '}
                    {detail.activationEmailSent ? 'emailed successfully' : 'no email sent'}.
                  </p>
                </div>
              ) : detail.status === 'REJECTED' ? (
                <p>Rejected {formatDate(detail.reviewedAt)}. The applicant cannot create an account.</p>
              ) : (
                <p>Waiting for a decision. Nothing has been sent to the applicant yet.</p>
              )}
            </section>
          </div>

          {/* ---------- Actions ---------- */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setEditing(detail)}>
              <Icon name="edit" className="h-4 w-4" />
              Edit details
            </Button>

            {detail.status === 'APPROVED' && !detail.userId ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy === `activation:${detail.id}`}
                onClick={() => newActivation(detail)}
              >
                <Icon name="link" className="h-4 w-4" />
                {busy === `activation:${detail.id}` ? 'Creating...' : 'New activation link'}
              </Button>
            ) : null}

            {!detail.userId && detail.status === 'PENDING' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectReason('');
                  setConfirm({ kind: 'reject', row: detail });
                }}
              >
                <Icon name="close" className="h-4 w-4" />
                Reject
              </Button>
            ) : null}

            {!detail.userId ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setConfirm({ kind: 'approve', row: detail })}
              >
                <Icon name="check" className="h-4 w-4" />
                {detail.status === 'APPROVED' ? 'Approve again / resend' : 'Approve'}
              </Button>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {/* ========================================
          EDIT DIALOG
          ======================================== */}
      {editing ? (
        <EditDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setBanner({ tone: 'success', text: 'The application has been updated.' });
            router.refresh();
          }}
        />
      ) : null}

      {/* ========================================
          CONFIRMATIONS
          ======================================== */}
      {confirm ? (
        <Modal
          onClose={() => setConfirm(null)}
          label={
            confirm.kind === 'approve'
              ? 'Confirm approval'
              : confirm.kind === 'reject'
                ? 'Confirm rejection'
                : 'Confirm deletion'
          }
          width="max-w-md"
        >
          <div className="px-5 py-4">
            <h2 className="text-base font-bold text-ink-900">
              {confirm.kind === 'approve'
                ? 'Approve this request?'
                : confirm.kind === 'reject'
                  ? 'Reject this request?'
                  : 'Delete this request permanently?'}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {confirm.kind === 'approve' ? (
                <>
                  <strong>{confirm.row.fullName}</strong> will be approved and a private activation
                  link will be created for <strong>{confirm.row.email}</strong>. No account is created
                  until they open it and choose a password.
                </>
              ) : confirm.kind === 'reject' ? (
                <>
                  <strong>{confirm.row.fullName}</strong> will be marked as rejected and the
                  activation link (if any) will stop working. The record stays in this list.
                </>
              ) : (
                <>
                  The application from <strong>{confirm.row.fullName}</strong> will be removed for
                  good. This cannot be undone. A request that produced an account cannot be deleted.
                </>
              )}
            </p>

            {confirm.kind === 'reject' ? (
              <div className="mt-4">
                <TextareaField
                  label="Reason (optional)"
                  name="rejectionReason"
                  rows={3}
                  placeholder="Shown to the applicant in the email, for example: we have no vacant place in this ward at the moment."
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  hint="Leave empty to reject without giving a reason."
                />
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>

              {confirm.kind === 'approve' ? (
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy === `approve:${confirm.row.id}`}
                  onClick={() => approve(confirm.row)}
                >
                  {busy === `approve:${confirm.row.id}` ? (
                    <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                      <Icon name="refresh" className="h-4 w-4 animate-spin" />
                      Approving...
                    </span>
                  ) : (
                    'Yes, approve'
                  )}
                </Button>
              ) : confirm.kind === 'reject' ? (
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy === `reject:${confirm.row.id}`}
                  onClick={() => reject(confirm.row)}
                >
                  {busy === `reject:${confirm.row.id}` ? (
                    <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                      <Icon name="refresh" className="h-4 w-4 animate-spin" />
                      Rejecting...
                    </span>
                  ) : (
                    'Yes, reject'
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy === `delete:${confirm.row.id}`}
                  onClick={() => remove(confirm.row)}
                >
                  {busy === `delete:${confirm.row.id}` ? (
                    <span className="inline-flex items-center gap-2" role="status">
                      <Icon name="refresh" className="h-4 w-4 animate-spin" />
                      Deleting...
                    </span>
                  ) : (
                    'Delete permanently'
                  )}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// ========================================
// EDIT DIALOG
// ========================================
function EditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: MembershipRequestRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState({
    fullName: row.fullName,
    email: row.email,
    mobileNumber: row.mobileNumber,
    currentAddress: row.currentAddress,
    dateOfBirth: dateInput(row.dateOfBirth),
    occupation: row.occupation ?? '',
    reasonForJoining: row.reasonForJoining,
    requestLetter: row.requestLetter,
    adminNote: row.adminNote ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch(`/api/admin/membership-requests/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error: string; fields?: Record<string, string> }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setError(
          (payload && 'error' in payload && payload.error) || 'The changes could not be saved.',
        );
        if (payload && 'fields' in payload && payload.fields) setFieldErrors(payload.fields);
        return;
      }

      onSaved();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} label={`Edit application from ${row.fullName}`}>
      <form onSubmit={save} noValidate>
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Edit application</h2>
            <p className="text-xs text-ink-500">
              Changes are saved permanently and recorded in the activity log.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-1.5 text-ink-500 hover:bg-ink-100"
            aria-label="Close"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              name="editFullName"
              required
              value={values.fullName}
              onChange={(event) => set('fullName', event.target.value)}
              error={fieldErrors.fullName}
            />
            <TextField
              label="Mobile number"
              name="editMobile"
              required
              value={values.mobileNumber}
              onChange={(event) => set('mobileNumber', event.target.value)}
              error={fieldErrors.mobileNumber}
            />
          </div>

          <TextField
            label="Email address"
            name="editEmail"
            type="email"
            required
            value={values.email}
            onChange={(event) => set('email', event.target.value)}
            error={fieldErrors.email}
            hint="This is where the activation link is sent."
          />

          <TextField
            label="Current address"
            name="editAddress"
            required
            value={values.currentAddress}
            onChange={(event) => set('currentAddress', event.target.value)}
            error={fieldErrors.currentAddress}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <NepaliDateField
              label="Date of birth"
              name="editDob"
              value={values.dateOfBirth}
              onChange={(next) => set('dateOfBirth', next)}
              error={fieldErrors.dateOfBirth}
            />
            <TextField
              label="Occupation"
              name="editOccupation"
              value={values.occupation}
              onChange={(event) => set('occupation', event.target.value)}
              error={fieldErrors.occupation}
            />
          </div>

          <TextField
            label="Reason for joining"
            name="editReason"
            required
            value={values.reasonForJoining}
            onChange={(event) => set('reasonForJoining', event.target.value)}
            error={fieldErrors.reasonForJoining}
          />

          <TextareaField
            label="Request letter"
            name="editLetter"
            required
            rows={6}
            value={values.requestLetter}
            onChange={(event) => set('requestLetter', event.target.value)}
            error={fieldErrors.requestLetter}
          />

          <TextareaField
            label="Internal note"
            name="editNote"
            rows={2}
            hint="Only administrators see this. Never shown to the applicant."
            value={values.adminNote}
            onChange={(event) => set('adminNote', event.target.value)}
            error={fieldErrors.adminNote}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? (
              <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ========================================
// MODAL FRAME
// ========================================
// A plain fixed overlay: no library, no portal, and Escape / click-outside both
// close it. Focus is moved into the dialog so a keyboard user is not left behind
// on a button that is now hidden underneath.
function Modal({
  children,
  onClose,
  label,
  width = 'max-w-3xl',
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Stop the page behind the dialog from scrolling while it is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          'w-full overflow-hidden rounded-t-xl bg-white shadow-xl outline-none sm:rounded-card',
          width,
        )}
      >
        {children}
      </div>
    </div>
  );
}
