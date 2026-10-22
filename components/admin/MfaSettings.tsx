// ========================================
// ADMIN PANEL - SIGN-IN SECURITY (TWO-STEP VERIFICATION)
// ========================================
// The screen where ONE administrator turns two-step verification on or off for
// their own account.
//
// WHY IT IS THE ADMINISTRATOR'S OWN CHOICE
//   Nobody can switch it on for somebody else, and nobody can read somebody
//   else's key. The API route only ever touches the signed-in user's own row.
//
// THE ONE RULE THAT MATTERS HERE
//   The key is shown ONCE. After that it lives in the authenticator app and in
//   the database, and nowhere else - not in an email, not in a PDF, not in this
//   panel again. If it is lost, the office resets it with a command
//   (tools/disable-admin-mfa.mjs) rather than by reading it back.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TextField } from '@/components/forms/Field';
import { Icon } from '@/components/ui/Icon';

type Setup = { secret: string; otpauth: string; account: string };

export function MfaSettings({
  enabled,
  enabledAt,
}: {
  enabled: boolean;
  enabledAt: string | null;
}) {
  const router = useRouter();

  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  async function call(action: 'start' | 'confirm' | 'disable', body: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/security/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: unknown; message?: string }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setError((payload && 'error' in payload && payload.error) || 'That did not work. Please try again.');
        return null;
      }

      setMessage(payload.message ?? null);
      return payload.data;
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function start() {
    const data = (await call('start')) as Setup | null;
    if (data) {
      setSetup(data);
      setCode('');
    }
  }

  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = await call('confirm', { code });
    if (!data) return;

    setSetup(null);
    setCode('');
    router.refresh();
  }

  async function disable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = await call('disable', { code: disableCode });
    if (!data) return;

    setDisableCode('');
    setShowDisable(false);
    router.refresh();
  }

  async function copySecret() {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Your browser would not let the page copy the key. Please select it and copy by hand.');
    }
  }

  return (
    <div className="space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      {/* ---------- Current state ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-ink-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-50 text-brand-700">
            <Icon name="shield-check" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-ink-900">Authenticator app</p>
            <p className="mt-0.5 text-sm text-ink-600">
              {enabled
                ? 'On. Every sign-in asks for your password and a 6-digit code.'
                : 'Off. Your password alone signs you in.'}
            </p>
            {enabled && enabledAt ? (
              <p className="mt-1 text-xs text-ink-500">Turned on {enabledAt}</p>
            ) : null}
          </div>
        </div>

        <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'On' : 'Off'}</Badge>
      </div>

      {/* ========================================
          SETUP
          ======================================== */}
      {!enabled && !setup ? (
        <div className="rounded-card border border-ink-200 bg-white p-5">
          <p className="text-sm text-ink-700">
            Recommended for every administrator. It takes two minutes and needs one app on your
            phone - Google Authenticator, Authy, Microsoft Authenticator or any other.
          </p>
          <Button type="button" variant="primary" className="mt-4" disabled={busy === 'start'} onClick={start}>
            {busy === 'start' ? (
              <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
                Preparing...
              </span>
            ) : (
              <>
                <Icon name="lock" className="h-4 w-4" />
                Turn on two-step verification
              </>
            )}
          </Button>
        </div>
      ) : null}

      {setup ? (
        <form onSubmit={confirm} className="space-y-4 rounded-card border border-brand-200 bg-brand-50 p-5">
          <div>
            <p className="font-semibold text-brand-900">1. Add this key to your authenticator app</p>
            <p className="mt-1 text-xs text-brand-800">
              In the app choose &quot;Add account&quot; → &quot;Enter a setup key&quot;, and paste the key below.
              Give it any name you will recognise.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={setup.secret}
              onFocus={(event) => event.currentTarget.select()}
              className="input flex-1 bg-white font-mono text-sm tracking-wider"
              aria-label="Setup key"
            />
            <Button type="button" variant="outline" onClick={copySecret}>
              <Icon name={copied ? 'check' : 'link'} className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy key'}
            </Button>
          </div>

          <p className="text-xs text-brand-800">
            On a phone with this page open,{' '}
            <a href={setup.otpauth} className="font-semibold underline">
              tap here to open it directly in the app
            </a>
            .
          </p>

          <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Write the key down now.</strong> It is never shown again. If you lose the phone and
            the key, the office has to reset it for you with{' '}
            <code>tools/disable-admin-mfa.mjs</code>.
          </div>

          <div>
            <p className="mb-2 font-semibold text-brand-900">2. Type the 6-digit code the app shows</p>
            <TextField
              label="Verification code"
              name="confirmCode"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={busy === 'confirm'}>
              {busy === 'confirm' ? (
                <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                  <Icon name="refresh" className="h-4 w-4 animate-spin" />
                  Checking...
                </span>
              ) : (
                'Turn it on'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSetup(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {/* ========================================
          DISABLE
          ======================================== */}
      {enabled ? (
        <div className="rounded-card border border-ink-200 bg-white p-5">
          {!showDisable ? (
            <button
              type="button"
              onClick={() => setShowDisable(true)}
              className="text-sm font-semibold text-red-600 hover:underline"
            >
              Turn two-step verification off
            </button>
          ) : (
            <form onSubmit={disable} className="space-y-3">
              <p className="text-sm text-ink-700">
                Type a current code from your authenticator app to turn this off. Without the code,
                somebody who found an unattended browser could remove the second lock.
              </p>

              <TextField
                label="Current code"
                name="disableCode"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="danger" disabled={busy === 'disable'}>
                  {busy === 'disable' ? 'Turning off...' : 'Turn it off'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDisable(false)}>
                  Keep it on
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
