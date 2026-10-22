// ========================================
// MEMBER PORTAL - "CHOOSE YOUR PASSWORD"
// ========================================
// The last step of the join-up flow: an approved applicant opens the private link
// from their email and picks a password.
//
// WHO SETS THE PASSWORD
//   The applicant, here. Not an administrator, not a generated password in an
//   email. That is why the club can honestly say nobody else knows it.
//
// WHAT THE SERVER DOES WITH IT
//   POST /api/membership-requests/activate checks the link, checks the password
//   rules, hashes it with bcrypt, and only then creates the account - in one
//   transaction, so a half-created member can never exist.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/forms/Field';
import { Icon } from '@/components/ui/Icon';

export function ActivateAccountForm({
  token,
  fullName,
  email,
}: {
  token: string;
  fullName: string;
  email: string;
}) {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    // ---------- the same rules the server enforces ----------
    if (password.length < 8) {
      setFieldErrors({ password: 'Use at least 8 characters.' });
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setFieldErrors({ password: 'Include at least one letter and one number.' });
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'The two passwords do not match.' });
      return;
    }

    setBusy(true);

    try {
      const response = await fetch('/api/membership-requests/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | { ok: false; error: string; fields?: Record<string, string> }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setError(
          (payload && 'error' in payload && payload.error) ||
            'Your account could not be created. Please try again.',
        );
        if (payload && 'fields' in payload && payload.fields) setFieldErrors(payload.fields);
        return;
      }

      setDone(true);

      // Give the person a moment to read the confirmation, then take them to the
      // sign-in tab with their email already in the message.
      setTimeout(() => {
        router.replace('/member/portal?tab=login&notice=activated');
        router.refresh();
      }, 1800);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <h2 className="font-display text-xl font-bold text-ink-900">Your account is ready</h2>
        <p className="text-sm leading-relaxed text-ink-600">
          Welcome, {fullName}. Taking you to the sign-in page - use <strong>{email}</strong> and the
          password you just chose.
        </p>
        <p className="text-xs text-ink-500">Nothing happened? Open the member portal and sign in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="rounded-card bg-ink-50 p-4 text-sm">
        <p className="font-semibold text-ink-900">{fullName}</p>
        <p className="text-ink-600">{email}</p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div>
        <label htmlFor="password" className="label">
          Choose a password<span className="ml-0.5 text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`input pr-11 ${fieldErrors.password ? 'input-error' : ''}`}
            aria-invalid={fieldErrors.password ? true : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-btn p-2 text-ink-500 hover:bg-ink-100"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            <Icon name={show ? 'lock' : 'eye'} className="h-4 w-4" />
          </button>
        </div>
        {fieldErrors.password ? (
          <p className="field-error">{fieldErrors.password}</p>
        ) : (
          <p className="field-help">At least 8 characters, with one letter and one number.</p>
        )}
      </div>

      <TextField
        label="Type the password again"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={fieldErrors.confirmPassword}
      />

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? (
          <span className="inline-flex items-center gap-2 text-accent-100" role="status">
            <Icon name="refresh" className="h-4 w-4 animate-spin" />
            Please wait...
          </span>
        ) : (
          'Create my account'
        )}
      </Button>

      <p className="text-center text-xs text-ink-500">
        Your password is stored only as a scrambled hash. Nobody at the club - including
        administrators - can read it.
      </p>
    </form>
  );
}
