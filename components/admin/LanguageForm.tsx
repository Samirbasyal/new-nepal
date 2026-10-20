// ========================================
// ADMIN - WEBSITE LANGUAGE FORM
// ========================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { LANGUAGES, type Lang } from '@/lib/i18n';

export function LanguageForm({ current }: { current: Lang }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Lang>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch('/api/admin/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: choice }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload || payload.ok !== true) {
        setError(payload?.error ?? `Could not save the language. (HTTP ${response.status})`);
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-2xl p-6">
      <p className="text-sm text-ink-600">
        This changes the language of the <strong>whole website</strong> for every visitor, member
        and administrator. It stays until an administrator changes it again.
      </p>

      <fieldset className="mt-5 space-y-3">
        <legend className="sr-only">Website language</legend>
        {LANGUAGES.map((option) => (
          <label
            key={option.code}
            className={`flex cursor-pointer items-center gap-3 rounded-card border px-4 py-3 ${
              choice === option.code
                ? 'border-brand-600 bg-brand-50'
                : 'border-ink-200 bg-white hover:bg-ink-50'
            }`}
          >
            <input
              type="radio"
              name="language"
              value={option.code}
              checked={choice === option.code}
              onChange={() => setChoice(option.code)}
              className="h-4 w-4"
            />
            <span className="font-semibold text-ink-900">{option.native}</span>
            <span className="text-sm text-ink-500">{option.label}</span>
          </label>
        ))}
      </fieldset>

      {error ? (
        <div className="mt-4 rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="mt-4 flex items-center gap-2 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <Icon name="check-circle" className="h-4 w-4" />
          Saved. The website now uses{' '}
          {LANGUAGES.find((item) => item.code === choice)?.native}.
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || choice === current}
        className="btn btn-primary mt-5"
      >
        {busy ? (
          <span className="inline-flex items-center gap-2 text-accent-100" role="status">
            <Icon name="refresh" className="h-4 w-4 animate-spin" />
            Please wait...
          </span>
        ) : (
          'Save changes'
        )}
      </button>
    </div>
  );
}
