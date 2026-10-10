// ========================================
// MEMBER LOGIN + ADMIN LOGIN FORM
// ========================================
// This one component powers BOTH login pages:
//   /member/login  -> mode="member"
//   /admin/login   -> mode="admin"
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

  const isAdmin = mode === 'admin';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const succeeded = await submit(
      { email, password, remember, portal: mode },
      {
        onSuccess: () => {
          // Send the user to their dashboard and refresh so the navbar
          // and the panel both see the new session.
          router.replace(redirectTo);
          router.refresh();
        },
      },
    );

    return succeeded;
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
        {busy ? 'Signing in…' : isAdmin ? 'Sign in to Admin Panel' : 'Sign in'}
      </Button>

      {/* ---------- Links ---------- */}
      <div className="space-y-2 border-t border-ink-100 pt-4 text-center text-sm">
        {isAdmin ? (
          <p className="text-ink-500">
            This area is for administrators only.{' '}
            <Link href="/member/login" className="font-semibold text-brand-700 hover:underline">
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

            {/* ---------- Accounts are created by the office, not by visitors ---------- */}
            <p className="text-xs text-ink-500">
              Member accounts are created by the organization office. Please contact them with your
              name, email address and phone number, or{' '}
              <Link href="/join" className="font-medium text-ink-600 hover:underline">
                send us a request
              </Link>
              .
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

            <p className="text-xs text-ink-500">
              Administrators sign in at{' '}
              <Link href="/admin/login" className="font-medium text-ink-600 hover:underline">
                the admin page
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </form>
  );
}
