// ========================================
// ADMIN - WEBSITE LANGUAGE FORM
// ========================================
// The one switch that changes the language of the whole website.
//
// WHY IT LOOKS LIKE THIS
// The screen follows the approved design: a white card with a blue globe, the
// language that is live right now, two radio choices with flags, and one clear
// "Save Changes" button. Everything is real - pressing Save writes the choice
// to the database through /api/admin/language (which checks the admin role
// again on the server), so the choice survives refresh, logout and redeploy.
// ========================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useLang } from '@/components/ui/LangProvider';
import { LANGUAGES, type Lang } from '@/lib/i18n';

// ========================================
// FLAGS
// ========================================
// Small flag images, with the language name as the alt text so the choice is
// still readable if an image cannot load.
const FLAGS: Record<string, string> = {
  ne: 'https://flagcdn.com/w40/np.png',
  en: 'https://flagcdn.com/w40/gb.png',
};

export function LanguageForm({ current }: { current: Lang }) {
  const router = useRouter();
  const { tr } = useLang();

  // `current` is what the database holds; `choice` is what is picked on screen.
  const [choice, setChoice] = useState<Lang>(current);
  const [active, setActive] = useState<Lang>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const nameOf = (code: Lang) => LANGUAGES.find((item) => item.code === code)?.native ?? code;

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
        setError(payload?.error ?? `${tr('Could not save the language.')} (HTTP ${response.status})`);
        return;
      }

      setActive(choice);
      setSaved(true);
      // The sidebar, the header and every panel page are rebuilt in the new
      // language without a full page reload.
      router.refresh();
    } catch {
      setError(tr('Could not reach the server. Please check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  }

  const unchanged = choice === active;

  return (
    <div className="card overflow-hidden">
      {/* ---------- Card heading ---------- */}
      <div className="flex items-start gap-4 border-b border-ink-100 p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Icon name="globe" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink-900">{tr('Website Language')}</h2>
          <p className="mt-1 text-sm text-ink-500">
            {tr('Choose the language that will be displayed on the entire website for all users.')}
          </p>
        </div>
      </div>

      <div className="p-6">
        {/* ---------- Which language is live now ---------- */}
        <div className="rounded-xl border border-ink-200 bg-ink-50/60 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-ink-700">
              {tr('Active Website Language')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {nameOf(active)}
            </span>
          </div>
        </div>

        {/* ---------- The two choices ---------- */}
        <fieldset className="mt-5">
          <legend className="sr-only">{tr('Website Language')}</legend>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl lg:flex-1">
              {LANGUAGES.map((option) => {
                const picked = choice === option.code;

                return (
                  <label
                    key={option.code}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      picked
                        ? 'border-blue-500 bg-blue-50/60 ring-1 ring-inset ring-blue-500'
                        : 'border-ink-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={option.code}
                      checked={picked}
                      onChange={() => {
                        setChoice(option.code);
                        setSaved(false);
                      }}
                      className="h-4 w-4 accent-blue-600"
                    />

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={FLAGS[option.code]}
                      alt=""
                      width={24}
                      height={16}
                      className="h-4 w-6 rounded-[2px] object-cover ring-1 ring-ink-200"
                      loading="lazy"
                    />

                    <span className="text-sm font-semibold text-ink-900">
                      {option.native} ({option.label})
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || unchanged}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <Icon name={busy ? 'refresh' : 'save'} className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
              {busy ? tr('Please wait…') : tr('Save Changes')}
            </button>
          </div>
        </fieldset>

        {/* ---------- What happened ---------- */}
        {error ? (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {saved ? (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong className="block">{tr('Language updated successfully!')}</strong>
              <span className="text-emerald-700">
                {tr('The website language has been changed to')} {nameOf(choice)}.
              </span>
            </span>
          </div>
        ) : null}

        <p className="mt-5 text-xs leading-relaxed text-ink-500">
          {tr(
            'This is a single global setting: every visitor, member and administrator sees the website in the language chosen here. It is stored in the database, so it stays the same after a refresh, a sign-out or a new deployment.',
          )}
        </p>
      </div>
    </div>
  );
}
