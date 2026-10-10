// ========================================
// VERIFY EMAIL FORM
// ========================================
// Used on /member/verify-email.
//
// TWO WAYS THE MEMBER ARRIVES HERE
//   1. They clicked the link in the email  -> the address bar contains ?token=...
//      and this form sends it automatically the moment the page opens.
//   2. They opened the page themselves     -> they type their email address and
//      the 6 digit code, or press "send a new link".
//
// WHAT IS NEVER SHOWN
//   The code and the link are never displayed on this page.
//   A code shown on the screen proves nothing - anybody looking at the screen
//   could use it. If email is not set up yet, the link is printed in the SERVER
//   TERMINAL instead, and the page says so honestly.
// ========================================

'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/forms/Field';
import { useFormSubmit } from '@/hooks/useFormSubmit';

export function VerifyEmailForm({
  initialToken,
  initialEmail,
}: {
  /** The token from the link in the email, when there is one. */
  initialToken?: string;
  /** Pre-filled email (used after a resend, so they do not retype it). */
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [done, setDone] = useState(false);

  const verify = useFormSubmit('/api/auth/verify-email');
  const resend = useFormSubmit('/api/auth/resend-verification');

  // The link is sent only once, even in React's development double-render.
  // Without this guard the second request would say "this link has already been
  // used", which looks like a failure when the first one actually worked.
  const sentRef = useRef(false);

  useEffect(() => {
    if (!initialToken || sentRef.current) return;
    sentRef.current = true;

    void verify.submit({ token: initialToken }, { onSuccess: () => setDone(true) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  // ---------- Finished ----------
  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success">
          Your email address is verified. You can now sign in with your email address and password.
        </Alert>
        <Button variant="primary" size="lg" className="w-full" onClick={() => { window.location.href = '/member/login'; }}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------- Automatic check of the link ---------- */}
      {initialToken ? (
        <div className="space-y-4">
          {verify.error ? <Alert tone="error">{verify.error}</Alert> : null}

          {verify.busy ? (
            <Alert tone="info">Checking your link…</Alert>
          ) : (
            <>
              {verify.error ? (
                <p className="text-sm text-ink-600">
                  The link may have expired (they last 24 hours). Ask for a new one below.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* ---------- Type the code ---------- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void verify.submit({ email, code }, { onSuccess: () => setDone(true) });
        }}
        className="space-y-5"
        noValidate
      >
        {!initialToken && verify.error ? <Alert tone="error">{verify.error}</Alert> : null}

        <p className="text-sm text-ink-600">
          Type the email address the office used for you, and the 6 digit code from the message
          we sent you.
        </p>

        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={verify.fieldErrors.email}
        />

        <TextField
          label="6 digit code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder="000000"
          hint="The code is in the email we sent you. It expires after 24 hours."
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          error={verify.fieldErrors.code}
        />

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={verify.busy}>
          {verify.busy ? 'Checking…' : 'Verify my email'}
        </Button>
      </form>

      {/* ---------- Ask for a new link ---------- */}
      <div className="space-y-3 border-t border-ink-100 pt-5">
        <p className="text-sm font-medium text-ink-800">Did not get the email?</p>

        {resend.success ? <Alert tone="success">{resend.success}</Alert> : null}
        {resend.error ? <Alert tone="error">{resend.error}</Alert> : null}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={resend.busy || email.trim() === ''}
          onClick={() => void resend.submit({ email })}
        >
          {resend.busy ? 'Sending…' : 'Send me a new link'}
        </Button>

        <p className="text-xs text-ink-500">
          Check the spam or junk folder too. The link works for 24 hours and can be used once.
        </p>
      </div>

      <p className="text-center text-sm">
        <Link href="/member/login" className="font-semibold text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
