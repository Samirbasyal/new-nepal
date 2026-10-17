// ========================================
// DONOR ACCOUNTS - SIGN IN / CREATE AN ACCOUNT
// ========================================
// One form, two modes. Both post to their own route and, when they succeed, the
// donor lands on the page that shows the donations they made.
//
// WHAT IS CHECKED IN THE BROWSER
//   Exactly the same rules the server applies (lib/donor/schemas.ts): a real
//   email, a name, 8+ characters with a letter and a number, and both password
//   boxes matching. This is convenience, not security - the server checks again.
//
// WHAT HAPPENS AFTER
//   router.push() to the history page, then router.refresh() so the server parts
//   of the page are re-rendered with the new cookie in place.
// ========================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HoneypotField, TextField } from '@/components/forms/Field';

type Mode = 'login' | 'register';
type Errors = Record<string, string>;

export function DonorAuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [website, setWebsite] = useState('');

  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ========================================
  // BROWSER-SIDE CHECKS
  // ========================================
  function validate(): Errors {
    const found: Errors = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      found.email = 'Please enter a valid email address.';
    }

    if (mode === 'register') {
      if (name.trim().length < 2) found.name = 'Please enter your full name.';

      if (password.length < 8) found.password = 'Use at least 8 characters.';
      else if (!/[A-Za-z]/.test(password)) found.password = 'Include at least one letter.';
      else if (!/[0-9]/.test(password)) found.password = 'Include at least one number.';

      if (confirmPassword !== password) {
        found.confirmPassword = 'The two passwords do not match.';
      }

      const digits = phone.replace(/[^\d]/g, '');
      if (phone.trim() !== '' && (digits.length < 6 || digits.length > 15)) {
        found.phone = 'Please enter the mobile number using digits only (6 to 15 digits).';
      }
    } else if (password.length === 0) {
      found.password = 'Please enter your password.';
    }

    return found;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFailure(null);
      return;
    }

    setErrors({});
    setFailure(null);
    setBusy(true);

    try {
      const url = mode === 'register' ? '/api/donor/register' : '/api/donor/login';

      const body =
        mode === 'register'
          ? { name: name.trim(), email: email.trim(), phone: phone.trim() || null, password, confirmPassword, website }
          : { email: email.trim(), password, remember };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        if (payload?.fields && typeof payload.fields === 'object') setErrors(payload.fields);
        setFailure(payload?.error ?? 'That did not work. Please try again.');
        return;
      }

      const data = payload?.data ?? {};
      const wanted = next && next.startsWith('/') ? next : null;

      // ---------- the address still has to be proven ----------
      // No cookie was created, so this is not a sign-in yet. The code page
      // finishes the job and then returns to wherever the donor was going.
      if (data.needsVerification) {
        const query = new URLSearchParams({ email: String(data.email ?? email.trim()) });
        if (wanted) query.set('next', wanted);

        if (data.emailSent === false) {
          setFailure(
            'Your account is created, but the code could not be emailed. On the next page you can try again.',
          );
        }

        router.push(`/donor/verify-email?${query.toString()}`);
        return;
      }

      // ---------- signed in ----------
      // A donor who came to give goes back to the donation form; anybody else
      // lands on their dashboard.
      const target = wanted ?? (mode === 'register' ? '/donate/start' : '/donor/dashboard');
      router.push(target);
      router.refresh();
    } catch {
      setFailure('The website could not be reached. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === 'register';

  // Keeps the "where was I going" address alive when switching between the two
  // pages, so somebody who clicked Donate still arrives at the donation form.
  const withNext = (path: string) =>
    next && next.startsWith('/') ? `${path}?next=${encodeURIComponent(next)}` : path;

  return (
    <form onSubmit={submit} className="space-y-4">
      {failure ? <Alert tone="error">{failure}</Alert> : null}

      {isRegister ? (
        <TextField
          name="name"
          label="Full name"
          required
          autoComplete="name"
          placeholder="Your full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
        />
      ) : null}

      <TextField
        name="email"
        label="Email address"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
        hint={isRegister ? undefined : 'This is also your username.'}
      />

      {isRegister ? (
        <TextField
          name="phone"
          label="Mobile number (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="9812345678"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={errors.phone}
          hint="Only used so the office can reach you about a donation."
        />
      ) : null}

      <div>
        <TextField
          name="password"
          label="Password"
          type="password"
          required
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint={isRegister ? 'Use at least 8 characters, including a letter and a number.' : undefined}
        />

        {mode === 'login' ? (
          <label className="mt-2 flex items-center gap-2 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-ink-300"
            />
            Keep me signed in on this device
          </label>
        ) : null}
      </div>

      {isRegister ? (
        <TextField
          name="confirmPassword"
          label="Type the password again"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
        />
      ) : null}

      <HoneypotField value={website} onChange={setWebsite} />

      <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Icon name="refresh" className="h-4 w-4 animate-spin" />
            {isRegister ? 'Creating your account…' : 'Signing in…'}
          </>
        ) : (
          <>
            <Icon name={isRegister ? 'user-plus' : 'log-in'} className="h-4 w-4" />
            {isRegister ? 'Create my donor account' : 'Sign in'}
          </>
        )}
      </Button>

      <p className="text-center text-sm text-ink-600">
        {isRegister ? (
          <>
            Already have an account?{' '}
            <Link href={withNext('/donor/login')} className="font-semibold text-brand-700 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href={withNext('/donor/register')} className="font-semibold text-brand-700 hover:underline">
              Create a donor account
            </Link>
          </>
        )}
      </p>

      {mode === 'login' ? (
        <p className="text-center text-xs text-ink-500">
          <Link href="/donor/forgot-password" className="font-semibold text-brand-700 hover:underline">
            Forgot your password?
          </Link>{' '}
          {isRegister ? '' : 'We will email you a link to choose a new one.'}
        </p>
      ) : (
        <p className="text-center text-xs text-ink-500">
          A donor account is only for giving and for seeing your own history. It gives no access to the
          member or administrator panel.
        </p>
      )}
    </form>
  );
}
