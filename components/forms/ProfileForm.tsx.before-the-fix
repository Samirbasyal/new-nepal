// ========================================
// MEMBER PANEL - EDIT MY PROFILE
// ========================================
// Lets a signed-in member update the few details they are allowed to change.
//
// WHAT A MEMBER MAY CHANGE
//   name, phone, address, short introduction, photo link
//
// WHAT A MEMBER MAY NOT CHANGE (and why)
//   email    -> it identifies the account, only an administrator can change it
//   role     -> only an administrator can promote somebody
//   status   -> membership status is set by the organization
//   password -> it has its own separate form (see PasswordForm.tsx)
//
// These rules are enforced on the SERVER in app/api/member/profile/route.ts.
// Changing the page in the browser cannot bypass them.
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField, TextareaField } from '@/components/forms/Field';
import { useFormSubmit } from '@/hooks/useFormSubmit';

export type ProfileFormValues = {
  name: string;
  phone: string;
  address: string;
  bio: string;
  photoUrl: string;
};

export function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>({ ...initial });
  const { busy, success, error, fieldErrors, submit } = useFormSubmit('/api/member/profile');

  const update = (key: keyof ProfileFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return submit(values, {
      onSuccess: () => {
        // Refresh the server-rendered parts of the page (for example the name
        // shown in the member header).
        router.refresh();
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="name"
          required
          value={values.name}
          onChange={update('name')}
          error={fieldErrors.name}
        />

        <TextField
          label="Phone number"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={update('phone')}
          error={fieldErrors.phone}
        />
      </div>

      <TextField
        label="Address"
        name="address"
        value={values.address}
        onChange={update('address')}
        error={fieldErrors.address}
      />

      <TextareaField
        label="Short introduction"
        name="bio"
        rows={4}
        hint="Shown on the Members page only if an administrator marks your profile as public."
        value={values.bio}
        onChange={update('bio')}
        error={fieldErrors.bio}
      />

      <TextField
        label="Photo link"
        name="photoUrl"
        hint="Paste a link to your photo, or ask an administrator to upload one for you."
        value={values.photoUrl}
        onChange={update('photoUrl')}
        error={fieldErrors.photoUrl}
      />

      <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-5">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
