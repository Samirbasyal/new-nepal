// ========================================
// DONOR - CHOOSE A NEW PASSWORD
// ========================================
// The token comes from the link in the email. It is sent to the server exactly
// as it arrived; only the server can tell whether it is still good, and only the
// server decides.
//
// Rules are the same as at registration: 8+ characters, a letter and a number.
// When it succeeds the donor is not signed in automatically - the password was
// just changed from a link that could have been forwarded, so asking them to type
// the new password once is the safer end to the journey.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/forms/Field';

export function DonorResetForm({ token }: { token: string }) {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Include at least one letter and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/donor/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'The password could not be saved. Please try again.');
        return;
      }

      setDone(true);

      // A short pause so the success message is actually read.
      setTimeout(() => {
        router.push('/donor/login?notice=password-changed');
        router.refresh();
      }, 1400);
    } catch {
      setError('The website could not be reached. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Alert tone="success">
        Your new password is saved. Taking you to the sign-in page…
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <TextField
        name="password"
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint="At least 8 characters, including a letter and a number."
      />

      <TextField
        name="confirmPassword"
        label="Type the new password again"
        type="password"
        required
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

      <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Icon name="refresh" className="h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Icon name="save" className="h-4 w-4" />
            Save the new password
          </>
        )}
      </Button>
    </form>
  );
}
