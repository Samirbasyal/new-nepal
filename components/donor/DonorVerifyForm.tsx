// ========================================
// DONOR - TYPE THE SIX-DIGIT CODE
// ========================================
// The last step after registering: prove the address belongs to you.
//
// WHY THIS MUST EXIST
//   A donor account is what ties a donation to a person. Without a proven
//   address, anybody could type somebody else's email and later sign in as them.
//
// WHAT HAPPENS ON SUCCESS
//   The API signs the donor in as part of confirming the code, so this form just
//   moves them on: back to the donation they started, or to their dashboard.
//
// NO MAIL SERVER?
//   The page above this form explains it. In that case a code was never sent and
//   the account is already active, so this page is only ever reached by somebody
//   who bookmarked it - the "send it again" button then says plainly that email
//   is not configured.
// ========================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export function DonorVerifyForm({ email, next }: { email: string; next?: string }) {
  const router = useRouter();
  const box = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    box.current?.focus();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(code.trim())) {
      setProblem('Please type the six digits from the email.');
      return;
    }

    setBusy(true);
    setProblem(null);
    setNotice(null);

    try {
      const response = await fetch('/api/donor/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'That code could not be confirmed. Please try again.');
        return;
      }

      const target = next && next.startsWith('/') ? next : '/donor/dashboard';
      router.push(target);
      router.refresh();
    } catch {
      setProblem('The website could not be reached. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResending(true);
    setProblem(null);
    setNotice(null);

    try {
      const response = await fetch('/api/donor/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json().catch(() => null);

      setNotice(
        payload?.message ??
          'If that address has an unconfirmed account, a new code is on its way.',
      );

      if (payload?.data?.mailConfigured === false) {
        setProblem('This website has no mail server configured, so no code can be sent. Please contact the office.');
      }
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      {notice ? <Alert tone="info">{notice}</Alert> : null}

      <div>
        <label htmlFor="code" className="block text-sm font-semibold text-ink-900">
          Six-digit code
        </label>

        <input
          id="code"
          ref={box}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          className="mt-2 w-full rounded-card border border-ink-300 bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />

        <p className="mt-1.5 text-xs text-ink-500">
          Sent to <span className="font-semibold text-ink-700">{email}</span>. It works once and expires
          in 15 minutes.
        </p>
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Icon name="refresh" className="h-4 w-4 animate-spin" />
            Confirming…
          </>
        ) : (
          <>
            <Icon name="check-circle" className="h-4 w-4" />
            Confirm and continue
          </>
        )}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={resending}
          className="font-semibold text-brand-700 hover:underline disabled:text-ink-400"
        >
          {resending ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Send the code again'}
        </button>

        <a href="/donor/login" className="text-ink-600 hover:text-brand-700">
          Use a different email
        </a>
      </div>
    </form>
  );
}
