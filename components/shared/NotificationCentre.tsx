// ========================================
// NOTIFICATION CENTRE (shared by the member panel and the Admin Panel)
// ========================================
// One component, used on /member/notifications and /admin/notifications. It
// shows the signed-in person's notifications and lets them mark them as read.
//
// LOADING, EMPTY AND ERROR STATES (all three are covered on purpose)
//   - while the list is being fetched it shows SKELETON rows, not a blank page
//   - when there is nothing it says so in plain words
//   - when something goes wrong it explains it and offers Try again
//
// SAFETY WHILE SENDING
//   The button that is working is disabled and shows a spinner, so a second
//   click cannot send the same request twice.
// ========================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { formatDateTime } from '@/lib/utils';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

/** The colour of one notification, by its type. Written out in full so the
 *  styling tool can see every class. */
const TONES: Record<
  string,
  { badge: string; ring: string; icon: 'info' | 'check-circle' | 'clock' | 'close' }
> = {
  INFO: { badge: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', icon: 'info' },
  SUCCESS: { badge: 'bg-green-50 text-green-700', ring: 'ring-green-200', icon: 'check-circle' },
  WARNING: { badge: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', icon: 'clock' },
  ERROR: { badge: 'bg-red-50 text-red-700', ring: 'ring-red-200', icon: 'close' },
};

export function NotificationCentre() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [busyClear, setBusyClear] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // ---------- load the list ----------
  const load = useCallback(async () => {
    setProblem(null);

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'Your notifications could not be loaded. Please try again.');
        setNotifications([]);
        return;
      }

      setNotifications(payload.data.notifications ?? []);
      setUnread(Number(payload.data.unread ?? 0));
    } catch {
      setProblem('The website could not be reached. Please check your connection and try again.');
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ---------- mark one as read ----------
  const markOne = async (id: string) => {
    setBusyId(id);
    setDone(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', id }),
        // keepalive: the click also navigates to the page the notice points at,
        // and without this the browser can cancel the request on the way out -
        // which is exactly why the number used to stay put.
        keepalive: true,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'It could not be marked as read. Please try again.');
        return;
      }

      // Update the row in place, so the list does not jump.
      setNotifications((current) =>
        (current ?? []).map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
      setUnread(Number(payload.data?.unread ?? Math.max(0, unread - 1)));
      setDone('Marked as read.');
      // Tell the bell (which lives in the header, outside this component) that the
      // count changed, so it re-reads it instead of waiting for the next poll.
      window.dispatchEvent(new Event('notifications:changed'));
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  // ---------- mark everything as read ----------
  const markAll = async () => {
    setBusyAll(true);
    setDone(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'They could not be marked as read. Please try again.');
        return;
      }

      setNotifications((current) => (current ?? []).map((item) => ({ ...item, isRead: true })));
      setUnread(0);
      setDone(payload.message ?? 'All marked as read.');
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setBusyAll(false);
    }
  };

  // ---------- delete one ----------
  // A message is not a record: once it has been read and acted on, keeping it
  // only clutters the list. Nothing financial is lost - the donation, the
  // payment and the activity log are all elsewhere.
  const removeOne = async (id: string, title: string) => {
    const sure = window.confirm(`Delete this notification?\n\n${title}\n\nThe message is removed. The donation or payment it is about is not affected.`);
    if (!sure) return;

    setBusyDeleteId(id);
    setDone(null);
    setProblem(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'It could not be deleted. Please try again.');
        return;
      }

      setNotifications((current) => (current ?? []).filter((item) => item.id !== id));
      setUnread(Number(payload.data?.unread ?? unread));
      setDone('Notification deleted.');
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setBusyDeleteId(null);
    }
  };

  // ---------- delete everything already read ----------
  const clearRead = async () => {
    const readCount = (notifications ?? []).filter((item) => item.isRead).length;

    if (readCount === 0) {
      setDone('There are no read notifications to delete.');
      return;
    }

    const sure = window.confirm(
      `Delete ${readCount} notification${readCount === 1 ? '' : 's'} that you have already read?\n\nUnread ones are kept.`,
    );
    if (!sure) return;

    setBusyClear(true);
    setDone(null);
    setProblem(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-read' }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'They could not be deleted. Please try again.');
        return;
      }

      await load();
      setDone(payload.message ?? 'Read notifications deleted.');
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setBusyClear(false);
    }
  };

  // ========================================
  // LOADING: skeleton rows, never a blank page
  // ========================================
  if (notifications === null) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((row) => (
          <div key={row} className="card animate-pulse p-4">
            <div className="h-4 w-40 rounded bg-ink-100" />
            <div className="mt-3 h-3 w-full rounded bg-ink-100" />
            <div className="mt-2 h-3 w-2/3 rounded bg-ink-100" />
          </div>
        ))}
        <p className="text-sm text-ink-500">Loading your notifications…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---------- the bar above the list ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          {unread > 0 ? (
            <>
              <strong className="font-semibold text-ink-900">{unread}</strong> waiting to be read
            </>
          ) : (
            'Nothing waiting to be read.'
          )}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="btn btn-outline btn-sm"
            disabled={busyAll}
          >
            <Icon name="refresh" className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => void markAll()}
            className="btn btn-primary btn-sm"
            disabled={busyAll || unread === 0}
          >
            {busyAll ? (
              <>
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
                Marking…
              </>
            ) : (
              <>
                <Icon name="check-circle" className="h-4 w-4" />
                Mark all as read
              </>
            )}
          </button>

          {/* Clears the ones already dealt with, and leaves anything unread
              alone. This is the tidy-up after a busy week, not a reset. */}
          <button
            type="button"
            onClick={() => void clearRead()}
            className="btn btn-outline btn-sm text-red-700"
            disabled={busyClear || (notifications ?? []).every((item) => !item.isRead)}
          >
            {busyClear ? (
              <>
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Icon name="trash" className="h-4 w-4" />
                Delete read
              </>
            )}
          </button>
        </div>
      </div>

      {/* ---------- a friendly message or a friendly problem ---------- */}
      {problem ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1">{problem}</p>
        </div>
      ) : null}

      {done && !problem ? (
        <div className="rounded-card border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {done}
        </div>
      ) : null}

      {/* ---------- empty ---------- */}
      {notifications.length === 0 ? (
        <div className="card p-6 text-center">
          <Icon name="bell" className="mx-auto h-8 w-8 text-ink-300" />
          <h3 className="mt-3 font-display text-base font-bold text-ink-900">
            No notifications yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
            Important things appear here: a monthly contribution that is due, a payment that was
            approved or refused, loan news, and notices from the office.
          </p>
        </div>
      ) : (
        /* ---------- the list ---------- */
        <ul className="space-y-3">
          {notifications.map((item) => {
            const tone = TONES[item.type] ?? TONES.INFO;

            const body = (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone.badge} ${tone.ring}`}
                  >
                    <Icon name={tone.icon} className="h-3.5 w-3.5" />
                    {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                  </span>

                  {!item.isRead ? (
                    <span className="inline-flex items-center rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                      New
                    </span>
                  ) : null}

                  <span className="text-xs text-ink-500">{formatDateTime(item.createdAt)}</span>
                </div>

                <h3
                  className={`mt-2 font-display text-base ${item.isRead ? 'font-semibold text-ink-700' : 'font-bold text-ink-900'}`}
                >
                  {item.title}
                </h3>

                <p className="mt-1 text-sm text-ink-600">{item.message}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {item.link ? (
                    <Link
                      href={item.link}
                      onClick={() => {
                        // Opening a notice IS reading it. Only unread rows are sent,
                        // so opening the same notice twice cannot count twice.
                        if (!item.isRead) void markOne(item.id);
                      }}
                      className="text-sm font-semibold text-brand-700 hover:underline"
                    >
                      Open
                    </Link>
                  ) : null}

                  {!item.isRead ? (
                    <button
                      type="button"
                      onClick={() => void markOne(item.id)}
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900 disabled:opacity-60"
                    >
                      {busyId === item.id ? (
                        <>
                          <Icon name="refresh" className="h-4 w-4 animate-spin" />
                          Marking…
                        </>
                      ) : (
                        <>
                          <Icon name="check-circle" className="h-4 w-4" />
                          Mark as read
                        </>
                      )}
                    </button>
                  ) : null}

                  {/* Remove this one message. The donation or payment it talks
                      about is untouched - only the notice goes. */}
                  <button
                    type="button"
                    onClick={() => void removeOne(item.id, item.title)}
                    disabled={busyDeleteId === item.id}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800 disabled:opacity-60"
                  >
                    {busyDeleteId === item.id ? (
                      <>
                        <Icon name="refresh" className="h-4 w-4 animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Icon name="trash" className="h-4 w-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </>
            );

            return (
              <li
                key={item.id}
                className={`card p-4 ${item.isRead ? '' : 'border-l-4 border-l-brand-600'}`}
              >
                {body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
