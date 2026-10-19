// ========================================
// MEMBER PANEL - CHANGE MY PASSWORD
// ========================================
// A separate form for changing a password, because a password change needs
// extra care:
//
//   1. The member must type the CURRENT password (so that somebody who finds
//      an unlocked laptop cannot silently take over the account).
//   2. The new password must be typed twice and must be at least 8 characters.
//   3. Only the hash is stored - the real password is never saved anywhere.
//
// The server checks all of this again in app/api/member/password/route.ts.
// ========================================

'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/forms/Field';
import { useFormSubmit } from '@/hooks/useFormSubmit';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function PasswordForm() {
  const [values, setValues] = useState({ ...EMPTY });
  const { busy, success, error, fieldErrors, submit } = useFormSubmit('/api/member/password');

  const update = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return submit(values, { onSuccess: () => setValues({ ...EMPTY }) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <TextField
        label="Current password"
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
        value={values.currentPassword}
        onChange={update('currentPassword')}
        error={fieldErrors.currentPassword}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="New password"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters."
          value={values.newPassword}
          onChange={update('newPassword')}
          error={fieldErrors.newPassword}
        />

        <TextField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={update('confirmPassword')}
          error={fieldErrors.confirmPassword}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-5">
        <Button type="submit" disabled={busy}>
          {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Update password'}
        </Button>
      </div>
    </form>
  );
}
