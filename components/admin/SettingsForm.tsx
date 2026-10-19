// ========================================
// ADMIN PANEL - WEBSITE SETTINGS FORM
// ========================================
// Lets the organization change its own website without editing code:
// organization name, contact details, social links, homepage text,
// donation details and impact numbers.
//
// WHERE THE VALUES GO
//   They are saved in the "site_settings" database table.
//   The website reads them with lib/settings.ts, which falls back to the
//   defaults in config/site.ts when a field is empty.
//
// SAVING
//   One request to POST /api/admin/settings with all the values at once.
//   Only the keys listed in lib/settings.ts are accepted by the server.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField, TextareaField } from '@/components/forms/Field';

export type SettingField = {
  key: string;
  label: string;
  group: string;
  default: string;
  type: string;
};

export function SettingsForm({
  groups,
  initialValues,
}: {
  /** The settings, already grouped for display. */
  groups: { title: string; note?: string; fields: SettingField[] }[];
  initialValues: Record<string, string>;
}) {
  const router = useRouter();

  const [values, setValues] = useState<Record<string, string>>({ ...initialValues });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSuccess(null);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setError(
          (payload && 'error' in payload && payload.error) ||
            'Could not save the settings. Please try again.',
        );
        return;
      }

      setSuccess(payload.message || 'Settings saved.');
      // Re-render the server parts of the page, so the navbar and footer show
      // the new organization name immediately.
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {success ? <Alert tone="success">{success}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* ========================================
          ONE BOX PER GROUP OF SETTINGS
          ======================================== */}
      {groups.map((group) => (
        <section key={group.title} className="card p-6">
          <h2 className="text-base font-bold text-ink-900">{group.title}</h2>
          {group.note ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{group.note}</p>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                {field.type === 'textarea' ? (
                  <TextareaField
                    name={`setting-${field.key}`}
                    label={field.label}
                    rows={4}
                    value={values[field.key] ?? ''}
                    onChange={(event) => update(field.key, event.target.value)}
                    hint={`Database key: ${field.key}`}
                  />
                ) : (
                  <TextField
                    name={`setting-${field.key}`}
                    label={field.label}
                    value={values[field.key] ?? ''}
                    onChange={(event) => update(field.key, event.target.value)}
                    hint={`Database key: ${field.key}`}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ========================================
          SAVE BAR
          ======================================== */}
      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink-200 bg-white p-4 shadow-card">
        <p className="text-xs text-ink-500">
          Changes appear on the public website immediately after saving.
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setValues({ ...initialValues })}
            disabled={saving}
          >
            <Icon name="refresh" className="h-4 w-4" />
            Undo changes
          </Button>

          <Button type="submit" variant="primary" disabled={saving}>
            <Icon name="save" className="h-4 w-4" />
            {saving ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Save settings'}
          </Button>
        </div>
      </div>
    </form>
  );
}
