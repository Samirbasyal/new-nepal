// ========================================
// MEMBER LOGIN + ADMIN LOGIN FORM
// ========================================
// This one component powers BOTH login pages:
//   /member/portal -> mode="member"
//   /admin/<private slug> -> mode="admin"  (see lib/auth/admin-entry.ts)
//
// HOW THE LOGIN WORKS
//   1. The visitor types an email and password.
//   2. The form sends them to POST /api/auth/login
//   3. The server finds the account, checks the password against the stored
//      bcrypt hash, and - if everything matches - sets a signed session cookie.
//   4. The browser is sent to the dashboard.
//
// SECURITY NOTES
//   - The password is never stored or compared in the browser.
//   - For the admin page we also send portal: 'admin'. The server then
//     refuses to create a session for a normal member, so a member cannot
//     reach the admin panel even with correct credentials.
// ========================================

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CheckboxField, TextField } from '@/components/forms/Field';
import { Icon } from '@/components/ui/Icon';
import { useFormSubmit } from '@/hooks/useFormSubmit';

export function LoginForm({
  mode,
  redirectTo,
  notice,
}: {
  mode: 'member' | 'admin';
  /** Where to send the user after a successful login. */
  redirectTo: string;
  /** A message passed in the address bar (for example "login-required"). */
  notice?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { busy, error, fieldErrors, submit } = useFormSubmit('/api/auth/login');

  // ---------- second step (two-step verification) ----------
  // An administrator who has turned two-step verification on does not receive a
  // session from the password step. The server answers { mfaRequired: true } and
  // sets a short-lived challenge cookie; this state swaps the form for the code
  // box. Nothing is trusted from the browser - /api/auth/mfa checks the cookie,
  // the account and the code again on the server.
  const [stage, setStage] = useState<'password' | 'mfa'>('password');
  const [code, setCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const isAdmin = mode === 'admin';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const succeeded = await submit(
      { email, password, remember, portal: mode },
      {
        onSuccess: (data) => {
          const payload = data as { mfaRequired?: boolean } | null;

          if (payload?.mfaRequired) {
            // Password accepted, code still needed. The password is deliberately
            // forgotten by the form; it is no longer needed for anything.
            setPassword('');
            setCode('');
            setMfaError(null);
            setStage('mfa');
            return;
          }

          // Send the user to their dashboard and refresh so the navbar
          // and the panel both see the new session.
          router.replace(redirectTo);
          router.refresh();
        },
      },
    );

    return succeeded;
  }

  // ========================================
  // THE CODE STEP
  // ========================================
  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMfaBusy(true);
    setMfaError(null);

    try {
      const response = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: { redirectTo?: string } }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setMfaError(
          (payload && 'error' in payload && payload.error) ||
            'The code could not be checked. Please try again.',
        );
        setCode('');
        return;
      }

      router.replace(payload.data?.redirectTo ?? redirectTo);
      router.refresh();
    } catch {
      setMfaError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setMfaBusy(false);
    }
  }

  if (stage === 'mfa') {
    return (
      <form onSubmit={handleVerify} className="space-y-5" noValidate>
        <Alert tone="info">
          Your password was correct. Enter the 6-digit code from your authenticator app to finish
          signing in.
        </Alert>

        {mfaError ? <Alert tone="error">{mfaError}</Alert> : null}

        <TextField
          label="Verification code"
          name="code"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          hint="The code changes every 30 seconds."
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={mfaBusy}>
          {mfaBusy ? (
            <span className="inline-flex items-center gap-2" role="status">
              <Icon name="refresh" className="h-4 w-4 animate-spin" />
              Checking...
            </span>
          ) : (
            'Verify and sign in'
          )}
        </Button>

        <p className="text-center text-xs text-ink-500">
          <button
            type="button"
            onClick={() => {
              setStage('password');
              setCode('');
              setMfaError(null);
            }}
            className="font-semibold text-brand-700 hover:underline"
          >
            Use a different account
          </button>{' '}
          · Lost your authenticator? Ask another administrator to reset it.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* ---------- Messages passed through the address bar ---------- */}
      {notice === 'login-required' ? (
        <Alert tone="info">Please sign in to continue.</Alert>
      ) : null}

      {notice === 'signed-out' ? (
        <Alert tone="success">You have been signed out safely.</Alert>
      ) : null}

      {/* Arriving from the activation link: the account has just been created. */}
      {notice === 'activated' ? (
        <Alert tone="success">
          Your account is ready. Sign in with the password you just chose.
        </Alert>
      ) : null}

      {/* ---------- Server error (for example a wrong password) ---------- */}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* ---------- Email ---------- */}
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

      {/* ---------- Password ---------- */}
      <div>
        <label htmlFor="password" className="label">
          Password<span className="ml-0.5 text-red-500">*</span>
        </label>

        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isAdmin ? 'current-password' : 'current-password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`input pr-11 ${fieldErrors.password ? 'input-error' : ''}`}
            aria-invalid={fieldErrors.password ? true : undefined}
          />

          {/* Show / hide password button - helpful on phones */}
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-btn p-2 text-ink-500 hover:bg-ink-100"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon name={showPassword ? 'lock' : 'eye'} className="h-4 w-4" />
          </button>
        </div>

        {fieldErrors.password ? (
          <p className="field-error">{fieldErrors.password}</p>
        ) : null}
      </div>

      {/* ---------- Remember me ---------- */}
      <div className="flex items-center justify-between gap-3">
        <CheckboxField
          label="Keep me signed in"
          name="remember"
          description="Recommended only on your own device."
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : isAdmin ? 'Sign in to Admin Panel' : 'Sign in'}
      </Button>

      {/* ---------- Links ---------- */}
      <div className="space-y-2 border-t border-ink-100 pt-4 text-center text-sm">
        {isAdmin ? (
          <p className="text-ink-500">
            This area is for administrators only.{' '}
            <Link
              href="/member/portal?tab=login"
              className="font-semibold text-brand-700 hover:underline"
            >
              Member sign in
            </Link>
          </p>
        ) : (
          <>
            {/* ---------- Password recovery ---------- */}
            <p className="text-ink-600">
              <Link
                href="/member/forgot-password"
                className="font-semibold text-brand-700 hover:underline"
              >
                Forgot your password?
              </Link>
            </p>

            {/* ---------- Not a member yet ---------- */}
            <p className="text-xs text-ink-500">
              Not a member yet?{' '}
              <Link
                href="/member/portal?tab=register"
                className="font-semibold text-brand-700 hover:underline"
              >
                Request membership
              </Link>{' '}
              - the committee reviews every application, and you choose your own password once it is
              approved.
            </p>

            <p className="text-xs text-ink-500">
              Not verified your email yet?{' '}
              <Link
                href="/member/verify-email"
                className="font-medium text-ink-600 hover:underline"
              >
                Verify it here
              </Link>
              .
            </p>

            {/* NOTE: no administrator link is shown here (or anywhere else on the
                public website). The staff sign-in page has a private address that
                is given to administrators directly - see lib/auth/admin-entry.ts. */}
          </>
        )}
      </div>
    </form>
  );
}
