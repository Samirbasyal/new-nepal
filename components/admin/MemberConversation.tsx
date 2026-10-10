// ========================================
// ADMIN PANEL - ONE MEMBER'S CONVERSATION
// ========================================
// Shown on /admin/member-messages?memberId=... when the office opens a thread.
//
// WHAT IT DOES
//   - loads the whole conversation (member and office, oldest first)
//   - lets the office write a reply, which tells the member through their own
//     notification list
//
// THE SAME CARE AS EVERYWHERE ELSE
//   - skeleton rows while loading, an empty state, and a friendly message if
//     something goes wrong
//   - the Send button says "Sending…" and is disabled until the answer arrives,
//     so a double click cannot post the same reply twice
// ========================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { TextField, TextareaField } from '@/components/forms/Field';
import { formatDateTime } from '@/lib/utils';

type Message = {
  id: string;
  subject: string | null;
  body: string;
  mine: boolean;
  senderName: string;
  readAt: string | null;
  createdAt: string;
};

export function MemberConversation({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setProblem(null);

    try {
      const response = await fetch(`/api/admin/member-messages?memberId=${memberId}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'The conversation could not be loaded. Please try again.');
        setMessages([]);
        return;
      }

      setMessages(payload.data.messages ?? []);
    } catch {
      setProblem('The website could not be reached. Please try again.');
      setMessages([]);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    setFieldErrors({});
    setNotice(null);

    if (body.trim().length < 2) {
      setFieldErrors({ body: 'Please write your reply.' });
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/admin/member-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, subject: subject.trim() || null, body: body.trim() }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setFieldErrors(payload?.fields ?? {});
        setProblem(payload?.error ?? 'The reply could not be sent. Please try again.');
        return;
      }

      setMessages((current) => [...(current ?? []), payload.data as Message]);
      setSubject('');
      setBody('');
      setNotice(payload.message ?? 'Reply sent.');
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ---------- the conversation ---------- */}
      {messages === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((row) => (
            <div key={row} className="card animate-pulse p-4">
              <div className="h-3 w-28 rounded bg-ink-100" />
              <div className="mt-3 h-3 w-full rounded bg-ink-100" />
              <div className="mt-2 h-3 w-1/2 rounded bg-ink-100" />
            </div>
          ))}
          <p className="text-sm text-ink-500">Loading the conversation…</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="card p-6 text-center">
          <Icon name="mail" className="mx-auto h-8 w-8 text-ink-300" />
          <h3 className="mt-3 font-display text-base font-bold text-ink-900">
            {memberName} has not written anything yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
            You can still send the first message below. It appears in their member panel and they are
            notified straight away.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`card p-4 ${message.mine ? 'border-l-4 border-l-brand-600' : 'border-l-4 border-l-ink-300'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-ink-900">
                  {message.mine ? `Office (${message.senderName})` : memberName}
                </span>
                <span className="text-xs text-ink-500">{formatDateTime(message.createdAt)}</span>
              </div>

              {message.subject ? (
                <p className="mt-2 text-sm font-medium text-ink-800">{message.subject}</p>
              ) : null}

              <p className="mt-1 whitespace-pre-line text-sm text-ink-600">{message.body}</p>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- problems and confirmations ---------- */}
      {problem ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1">{problem}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex items-center gap-1.5 font-semibold text-red-800 underline"
          >
            <Icon name="refresh" className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : null}

      {notice && !problem ? (
        <div className="rounded-card border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      ) : null}

      {/* ---------- reply ---------- */}
      <div className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">Reply to {memberName}</h3>
        <p className="mt-1 text-xs text-ink-500">
          The member is notified as soon as you send it, and the reply appears in their member panel.
        </p>

        <div className="mt-4 space-y-4">
          <TextField
            label="Subject (optional)"
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="For example: About your October contribution"
            error={fieldErrors.subject}
          />

          <TextareaField
            label="Your reply"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            required
            error={fieldErrors.body}
          />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void send()}
            className="btn btn-primary btn-sm"
            disabled={sending}
          >
            {sending ? (
              <>
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Icon name="mail" className="h-4 w-4" />
                Send reply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
