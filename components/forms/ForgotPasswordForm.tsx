// ========================================
// FORGOT PASSWORD FORM
// ========================================
// Used on /member/forgot-password.
//
// STEP 1 of the two-step password reset:
//   type the registered email -> a real email with a link and a 6 digit code is
//   sent -> the member follows it to /member/reset-password.
//
// The answer is deliberately the same whether or not the address is registered,
// so this page cannot be used to discover who has an account. When the message
// really could not be sent (no mail server configured yet), the page says so
// instead of pretending - see lib/email/mailer.ts.
// ========================================

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/forms/Field';
import { useFormSubmit } from '@/hooks/useFormSubmit';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const { busy, success, error, fieldErrors, submit } = useFormSubmit('/api/auth/forgot-password');

  return (
    <div className="space-y-5">
      {sent ? (
        <>
          <Alert tone="success">{success}</Alert>
          <div className="space-y-3">
            <p className="text-sm text-ink-600">
              Open the link in that email, or type the 6 digit code on the next page. The link is
              valid for 30 minutes.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                window.location.href = '/member/reset-password';
              }}
            >
              I have the code - choose a new password
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await submit({ email }, { onSuccess: () => setSent(true) });
            return ok;
          }}
          className="space-y-5"
          noValidate
        >
          {error ? <Alert tone="error">{error}</Alert> : null}

          <p className="text-sm text-ink-600">
            Type the email address your account uses. We will send you a link to choose a new
            password. Nobody at the office can see your password - only you can change it.
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
            error={fieldErrors.email}
          />

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send me a reset link'}
          </Button>
        </form>
      )}

      <p className="border-t border-ink-100 pt-5 text-center text-sm">
        <Link href="/member/login" className="font-semibold text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
