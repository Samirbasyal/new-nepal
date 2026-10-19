// ========================================
// MEMBER PANEL - EDIT MY PROFILE
// ========================================
// Lets a signed-in member update the few details they are allowed to change.
//
// WHAT A MEMBER MAY CHANGE
//   name, phone, address, short introduction, photo
//
// WHAT A MEMBER MAY NOT CHANGE (and why)
//   email    -> it identifies the account, only an administrator can change it
//   role     -> only an administrator can promote somebody
//   status   -> membership status is set by the organization
//   password -> it has its own separate form (see PasswordForm.tsx)
//
// These rules are enforced on the SERVER in app/api/member/profile/route.ts.
// Changing the page in the browser cannot bypass them.
//
// ========================================
// THE PHOTO
// ========================================
// A member can now UPLOAD their photo straight from this page - from a phone or
// a computer - instead of having to find a link somewhere else and paste it.
//
// Two steps, and the member sees both:
//   1. "Upload a photo" sends the file to /api/upload with purpose 'photo'.
//      The server stores it and answers with its permanent address.
//   2. "Save changes" writes that address onto the profile.
//
// The photo is stored PUBLICLY because it is meant to appear on the website.
// The address is only shown on the Members page when an administrator marks the
// profile as public - that switch lives in the Admin Panel, not here.
//
// The link box is still there for anyone who prefers to paste a link to a photo
// that is already online.
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField, TextareaField } from '@/components/forms/Field';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { checkImageFile } from '@/lib/upload-limits';

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { busy, success, error, fieldErrors, submit } = useFormSubmit('/api/member/profile');

  const update = (key: keyof ProfileFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  // ========================================
  // STEP 1 - send the chosen picture to the server
  // ========================================
  async function handlePhotoChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Clear the box straight away, so choosing the SAME file again after a
    // mistake still fires this event.
    event.target.value = '';

    if (!file) return;

    // ---------- 4 MB rule, checked before the upload starts ----------
    const check = checkImageFile(file);
    if (!check.ok) {
      setUploadError(check.error);
      return;
    }

    setUploadError(null);
    setUploadedUrl(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // 'photo' means "this belongs on the website", so it is stored publicly.
      formData.append('purpose', 'photo');

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.ok) {
        setUploadError(json?.error ?? 'The photo could not be uploaded.');
        return;
      }

      const url = json.data.url as string;
      setValues((current) => ({ ...current, photoUrl: url }));
      setUploadedUrl(url);
    } catch {
      setUploadError('The photo could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // ========================================
  // STEP 2 - save everything onto the profile
  // ========================================
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return submit(values, {
      onSuccess: () => {
        setUploadedUrl(null);
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

      {/* ========================================
          PHOTO
          ======================================== */}
      <div className="rounded-card border border-ink-200 bg-ink-50/40 p-4 sm:p-5">
        <p className="text-sm font-semibold text-ink-800">Your photo</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Upload a picture from your phone or computer. Your name and photo appear on the
          public Members page only if an administrator marks your profile as public.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-ink-200 bg-white">
            {values.photoUrl ? (
              // A plain <img> is used on purpose: it accepts any picture address,
              // including one the member pasted from a phone, without extra setup.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={values.photoUrl} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center text-[11px] leading-tight text-ink-400">
                No photo yet
              </div>
            )}
          </div>

          <div className="flex flex-col items-start gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handlePhotoChosen}
            />

            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? 'Uploading…' : values.photoUrl ? 'Choose a different photo' : 'Upload a photo'}
            </Button>

            {values.photoUrl ? (
              <button
                type="button"
                className="text-xs font-medium text-red-600 hover:underline"
                onClick={() => {
                  setValues((current) => ({ ...current, photoUrl: '' }));
                  setUploadedUrl(null);
                }}
              >
                Remove photo
              </button>
            ) : null}

            <p className="text-[11px] text-ink-400">JPG, PNG, WEBP or GIF, up to 4 MB.</p>
          </div>
        </div>

        {uploadError ? (
          <div className="mt-4">
            <Alert tone="error">{uploadError}</Alert>
          </div>
        ) : null}

        {uploadedUrl ? (
          <div className="mt-4">
            <Alert tone="success">
              Uploaded. Now press <strong>Save changes</strong> below to keep it.
            </Alert>
          </div>
        ) : null}

        <div className="mt-4">
          <TextField
            label="Photo link"
            name="photoUrl"
            hint="Filled in automatically when you upload. You can also paste a link to a photo that is already online."
            value={values.photoUrl}
            onChange={update('photoUrl')}
            error={fieldErrors.photoUrl}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-5">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
