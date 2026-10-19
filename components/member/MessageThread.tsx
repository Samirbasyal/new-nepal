// ========================================
// MEMBER PANEL - THE CONVERSATION WITH THE OFFICE
// ========================================
// Used on /member/messages.
//
// A member writes to the office and reads the replies, in one thread. The
// office answers from the Admin Panel (/admin/messages), so nothing needs a
// separate inbox.
//
// WHAT THIS COMPONENT DOES ABOUT MISTAKES AND WAITING
//   - skeleton rows while the conversation loads
//   - a plain "nothing here yet" message when the thread is empty
//   - a friendly explanation if something goes wrong, with Try again
//   - the Send button says "Sending…" and is disabled until the answer arrives,
//     so the same message cannot be sent twice by a double click
// ========================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { TextField, TextareaField } from '@/components/forms/Field';
import { formatDateTime } from '@/lib/utils';

type Message = {
  id: string;
  kind?: string;
  audioUrl?: string | null;
  audioDuration?: number | null;
  subject: string | null;
  body: string;
  mine: boolean;
  senderName: string;
  createdAt: string;
  readAt: string | null;
};

export function MessageThread() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // ---------- voice recording ----------
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  // ---------- load the conversation ----------
  const load = useCallback(async () => {
    setProblem(null);

    try {
      const response = await fetch('/api/member/messages', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'Your messages could not be loaded. Please try again.');
        setMessages([]);
        return;
      }

      // Only replace the list when something actually changed, so a background
      // refresh does not make the conversation jump while it is being read.
      const next = (payload.data.messages ?? []) as Message[];
      setMessages((current) => {
        if (!current) return next;
        const sameLength = current.length === next.length;
        const sameLast = current[current.length - 1]?.id === next[next.length - 1]?.id;
        return sameLength && sameLast ? current : next;
      });
    } catch {
      setProblem('The website could not be reached. Please check your connection and try again.');
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ---------- keep the conversation live ----------
  // A reply from the office appears within a few seconds, without a refresh.
  // The page only asks while it is visible, so a phone in a pocket is not
  // polling the server all day.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [load]);

  // Keep the newest message in view.
  useEffect(() => {
    if (messages && messages.length > 0) {
      endRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [messages]);

  // ---------- send ----------
  const send = async () => {
    setFieldErrors({});
    setNotice(null);

    if (body.trim().length < 2) {
      setFieldErrors({ body: 'Please write your message.' });
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/member/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim() || null, body: body.trim() }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setFieldErrors(payload?.fields ?? {});
        setProblem(payload?.error ?? 'Your message could not be sent. Please try again.');
        return;
      }

      // Add it to the thread straight away, so the member sees it happen.
      setMessages((current) => [...(current ?? []), payload.data as Message]);
      setSubject('');
      setBody('');
      setNotice('Your message has been sent to the office.');
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ---------- record a voice message ----------
  async function startRecording() {
    setProblem(null);
    setNotice(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setProblem('This browser cannot record audio. Please try Chrome or Safari on a phone.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => stream.getTracks().forEach((track) => track.stop());

      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecSeconds(0);
      setRecording(true);
    } catch {
      setProblem(
        'The microphone could not be opened. Please allow microphone access in the browser and try again.',
      );
    }
  }

  async function stopAndSend() {
    const recorder = recorderRef.current;
    if (!recorder) return;

    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));

    setRecording(false);
    recorderRef.current = null;
    recorder.stop();

    setVoiceBusy(true);

    try {
      // Give the recorder a moment to hand over the last chunk.
      await new Promise((resolve) => setTimeout(resolve, 250));

      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });

      if (blob.size > 4 * 1024 * 1024) {
        setProblem('That recording is larger than 4 MB. Please record a shorter message.');
        return;
      }

      const form = new FormData();
      form.append('file', blob, 'voice.webm');
      form.append('duration', String(duration));

      const response = await fetch('/api/member/messages/voice', { method: 'POST', body: form });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'The voice message could not be sent. Please try again.');
        return;
      }

      setMessages((current) => [...(current ?? []), payload.data as Message]);
      setNotice('Voice message sent to the office.');
    } catch {
      setProblem('The voice message could not be sent. Please check your connection.');
    } finally {
      setVoiceBusy(false);
    }
  }

  // Count the seconds, and stop by itself at three minutes.
  useEffect(() => {
    if (!recording) return;

    const timer = window.setInterval(() => {
      setRecSeconds((value) => {
        if (value + 1 >= 180) {
          void stopAndSend();
          return 180;
        }
        return value + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  return (
    <div className="space-y-5">
      {/* ---------- the conversation ---------- */}
      {messages === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((row) => (
            <div key={row} className="card animate-pulse p-4">
              <div className="h-3 w-32 rounded bg-ink-100" />
              <div className="mt-3 h-3 w-full rounded bg-ink-100" />
              <div className="mt-2 h-3 w-1/2 rounded bg-ink-100" />
            </div>
          ))}
          <p className="text-sm text-ink-500">Loading your conversation…</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="card p-6 text-center">
          <Icon name="mail" className="mx-auto h-8 w-8 text-ink-300" />
          <h3 className="mt-3 font-display text-base font-bold text-ink-900">
            You have not written to the office yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
            Use the box below for anything you want to ask about your membership, your monthly fund,
            a loan, or anything else. The office answers here, and the whole conversation stays in
            this page.
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
                  {message.mine ? 'You' : message.senderName}
                </span>
                <span className="text-xs text-ink-500">{formatDateTime(message.createdAt)}</span>
              </div>

              {message.subject ? (
                <p className="mt-2 text-sm font-medium text-ink-800">{message.subject}</p>
              ) : null}

              {message.kind === 'VOICE' && message.audioUrl ? (
                <div className="mt-2">
                  <audio controls preload="metadata" src={message.audioUrl} className="w-full max-w-sm" />
                  {message.audioDuration ? (
                    <p className="mt-1 text-xs text-ink-400">
                      Voice message · {Math.floor(message.audioDuration / 60)}:
                      {String(message.audioDuration % 60).padStart(2, '0')}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-line text-sm text-ink-600">{message.body}</p>
              )}

              {!message.mine && message.readAt ? (
                <p className="mt-2 text-xs text-ink-400">Read</p>
              ) : null}
            </li>
          ))}
          <div ref={endRef} />
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

      {/* ---------- write a message ---------- */}
      <div className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">Write to the office</h3>
        <p className="mt-1 text-xs text-ink-500">
          Nothing you type here is public. Only you and the office can see it.
        </p>

        <div className="mt-4 space-y-4">
          <TextField
            label="Subject (optional)"
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="For example: About my October contribution"
            error={fieldErrors.subject}
          />

          <TextareaField
            label="Your message"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            required
            error={fieldErrors.body}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {recording ? (
            <button
              type="button"
              onClick={() => void stopAndSend()}
              className="btn btn-primary btn-sm"
            >
              <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent-300" />
                Stop and send ({recSeconds}s)
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={voiceBusy}
              className="inline-flex items-center gap-2 rounded-btn border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-60"
            >
              {voiceBusy ? (
                <span className="inline-flex items-center gap-2 text-accent-600" role="status">
                  <Icon name="refresh" className="h-4 w-4 animate-spin" />
                  Please wait…
                </span>
              ) : (
                <>
                  <Icon name="mic" className="h-4 w-4" />
                  Record voice
                </>
              )}
            </button>
          )}

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
                Send message
              </>
            )}
          </button>
          <span className="text-xs text-ink-500">
            The office is notified as soon as you send it.
          </span>
        </div>
      </div>
    </div>
  );
}
