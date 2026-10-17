// ========================================
// DONOR - FORGOT PASSWORD
// ========================================
// One box, one button. The answer is deliberately the same whether or not the
// address has an account, so this form cannot be used to work out who donates.
//
// If the site has no mail server, the answer says so instead of "check your
// inbox" - a dead end is better than a lie.
// ========================================

'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/forms/Field';

export function DonorForgotForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setBusy(true);
    setError(null);
    setDone(null);

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

      if (payload?.data?.mailConfigured === false) {
        setError(
          'This website has no mail server configured, so a reset link cannot be sent. Please contact the office and they will help you.',
        );
        return;
      }

      setDone(
        payload?.message ??
          'If an account uses that email address, a link to choose a new password is on its way.',
      );
    } catch {
      setError('The website could not be reached. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {done ? (
        <Alert tone="success">
          {done} The link works once and expires in one hour. Check your spam folder if it has not
          arrived within a few minutes.
        </Alert>
      ) : null}

      <TextField
        name="email"
        label="Your email address"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setDone(null);
        }}
        hint="The address you registered with."
      />

      <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Icon name="refresh" className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Icon name="mail" className="h-4 w-4" />
            Send me a reset link
          </>
        )}
      </Button>

      <p className="text-center text-sm text-ink-600">
        Remembered it?{' '}
        <a href="/donor/login" className="font-semibold text-brand-700 hover:underline">
          Back to sign in
        </a>
      </p>
    </form>
  );
}
