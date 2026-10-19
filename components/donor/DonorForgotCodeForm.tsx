// ========================================
// DONOR - FORGOT PASSWORD (SIX-DIGIT CODE)
// ========================================
// Step 1  type the email address        -> a six-digit code is emailed
// Step 2  type the code + a new password -> the password is changed
// Step 3  sign in with the new password
//
// WHY A CODE AND NOT ONLY A LINK
//   A code can be read out over the phone to somebody who cannot open the email
//   on the same device. The link in the email still works as well - both contain
//   the same one-time secret.
//
// RESEND
//   Allowed once a minute. The button counts down, so nobody hammers the mail
//   server (which would also let the mail provider block the club's address).
// ========================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

type Stage = 'email' | 'code' | 'done';

export function DonorForgotCodeForm() {
  const [stage, setStage] = useState<Stage>('email');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Countdown for "Resend code".
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/donor/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? 'That request could not be sent. Please try again.');
        return;
      }

      setNotice(
        payload?.message ??
          'If an account uses that email address, a six-digit code is on its way. It expires in 15 minutes.',
      );
      setStage('code');
      setCooldown(60);
    } catch {
      setError('The website could not be reached. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setError(null);

    if (!/^\d{6}$/.test(code.replace(/\D/g, ''))) {
      setError('Please type the six-digit code from the email.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch('/api/donor/reset-with-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.replace(/\D/g, ''),
          password,
          confirmPassword,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'The password could not be changed. Please try again.');
        return;
      }

      setStage('done');
      setNotice(null);
    } catch {
      setError('The website could not be reached. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-btn border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

  // ---------- stage 3 ----------
  if (stage === 'done') {
    return (
      <div className="card p-6 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-green-200">
          <Icon name="check-circle" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-ink-900">Password changed</h2>
        <p className="mt-2 text-sm text-ink-600">
          You can now sign in with your new password. Every older code has stopped working.
        </p>
        <Link
          href="/donor/login"
          className="mt-5 inline-flex items-center gap-2 rounded-btn bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Icon name="log-in" className="h-4 w-4" />
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice && stage === 'code' ? (
        <div className="rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </div>
      ) : null}

      {/* ---------- stage 1 ---------- */}
      {stage === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="label">
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={inputClass}
              required
            />
            <p className="mt-1 text-xs text-ink-500">
              We will email a six-digit code. It works once and expires in 15 minutes.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
                Please wait…
              </span>
            ) : (
              <>
                <Icon name="mail" className="h-4 w-4" />
                Send me a code
              </>
            )}
          </button>
        </form>
      ) : null}

      {/* ---------- stage 2 ---------- */}
      {stage === 'code' ? (
        <form onSubmit={resetPassword} className="space-y-4">
          <div>
            <label htmlFor="forgot-code" className="label">
              Six-digit code
            </label>
            <input
              id="forgot-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className={`${inputClass} text-center text-xl font-bold tracking-[0.4em]`}
              required
            />
          </div>

          <div>
            <label htmlFor="forgot-password" className="label">
              New password
            </label>
            <input
              id="forgot-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters, with a letter and a number"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="forgot-confirm" className="label">
              Type the new password again
            </label>
            <input
              id="forgot-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
                Please wait…
              </span>
            ) : (
              'Change my password'
            )}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setStage('email');
                setCode('');
                setError(null);
              }}
              className="font-semibold text-ink-600 hover:underline"
            >
              Use a different email
            </button>

            <button
              type="button"
              onClick={() => void requestCode()}
              disabled={cooldown > 0 || busy}
              className="font-semibold text-brand-700 hover:underline disabled:text-ink-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
