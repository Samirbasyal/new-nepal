'use client';

// ========================================
// ADMIN PANEL - MY PICTURE
// ========================================
// Upload, replace or remove the picture shown in the top-right of the panel.
// Stored through /api/admin/profile/photo, which writes it onto the signed-in
// administrator's own account - there is no id in the request.
// ========================================

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const MAX_MB = 4;

export function AdminPhotoCard({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) {
      setMessage({ tone: 'error', text: 'Please choose a picture (JPG, PNG or WebP).' });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setMessage({ tone: 'error', text: `That picture is larger than ${MAX_MB} MB.` });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('photo', file);

      const response = await fetch('/api/admin/profile/photo', { method: 'POST', body: form });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setMessage({ tone: 'error', text: payload?.error ?? 'The picture could not be saved.' });
        return;
      }

      setPreview(payload.data.url);
      setMessage({ tone: 'success', text: 'Your picture has been saved.' });
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'The website could not be reached. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/profile/photo', { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setMessage({ tone: 'error', text: payload?.error ?? 'The picture could not be removed.' });
        return;
      }
      setPreview(null);
      setMessage({ tone: 'success', text: 'Your picture has been removed.' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-ink-900">My picture</h2>
      <p className="mt-1 text-xs text-ink-500">
        Shown in the top-right corner of the Admin Panel. JPG, PNG or WebP, up to {MAX_MB} MB.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xl font-bold text-brand-700">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </span>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
          <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Icon name="upload" className="h-4 w-4" />
            {busy ? 'Please wait...' : preview ? 'Replace picture' : 'Upload picture'}
          </Button>

          {preview ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()}>
              <Icon name="trash" className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {message ? (
        <div className="mt-3">
          <Alert tone={message.tone === 'success' ? 'success' : 'error'}>{message.text}</Alert>
        </div>
      ) : null}
    </section>
  );
}
