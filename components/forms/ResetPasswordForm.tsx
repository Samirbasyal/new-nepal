// ========================================
// RESET PASSWORD FORM
// ========================================
// Used on /member/reset-password.
//
// STEP 2 of the password reset. Two ways in, exactly like the verify page:
//   - the link from the email puts ?token=... in the address bar (hidden field)
//   - or the member types their email address and the 6 digit code
//
// ON SUCCESS the server hashes the new password with bcrypt and increases
// User.sessionVersion, so every device that was already signed in is thrown out
// immediately. The member is then sent to the sign-in page.
//
// The new password is checked here only for the obvious things (length, and the
// two boxes matching). The real check happens on the server.
// ========================================

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/forms/Field';
import { useFormSubmit } from '@/hooks/useFormSubmit';

export function ResetPasswordForm({ initialToken }: { initialToken?: string }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);

  const { busy, success, error, fieldErrors, submit } = useFormSubmit('/api/auth/reset-password');

  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{success}</Alert>
        <Alert tone="info">
          For your safety every device that was signed in has been signed out. Please sign in again
          with your new password.
        </Alert>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => {
            window.location.href = '/member/login';
          }}
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();

        if (password !== confirmPassword) {
          // The server checks this too; doing it here saves a pointless request.
          return;
        }

        await submit(
          { token: initialToken ?? null, email: email || null, code: code || null, password, confirmPassword },
          { onSuccess: () => setDone(true) },
        );
      }}
      className="space-y-5"
      noValidate
    >
      {error ? <Alert tone="error">{error}</Alert> : null}

      {initialToken ? (
        <Alert tone="info">
          You opened the link from your email, so you only need to choose a new password below.
        </Alert>
      ) : (
        <p className="text-sm text-ink-600">
          Type the email address of your account and the 6 digit code from the message, then choose
          your new password.
        </p>
      )}

      {!initialToken ? (
        <>
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
          />

          <TextField
            label="6 digit code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            error={fieldErrors.code}
          />
        </>
      ) : null}

      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
      />

      <TextField
        label="Type the new password again"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={
          fieldErrors.confirmPassword ??
          (confirmPassword !== '' && password !== confirmPassword
            ? 'The two passwords do not match.'
            : undefined)
        }
      />

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Saving…' : 'Save my new password'}
      </Button>

      <p className="text-center text-sm">
        <Link href="/member/login" className="font-semibold text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
