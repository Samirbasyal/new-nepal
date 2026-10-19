// ========================================
// ADMIN PANEL - THE EDIT / CREATE FORM
// ========================================
// A single form that can edit ANY section of the Admin Panel, because each
// page describes its own fields (see components/admin/types.ts).
//
// It appears as a panel that slides in from the right, which keeps the list
// visible behind it and works well on a phone too.
//
// HOW SAVING WORKS
//   NEW ITEM   -> POST   /api/admin/<section>
//   EXISTING   -> PATCH  /api/admin/<section>/<id>
//
// The server validates everything and answers with either the saved row or a
// list of field errors, which are shown under the matching inputs.
// ========================================

'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CheckboxField, SelectField, TextField, TextareaField } from '@/components/forms/Field';
import { Icon } from '@/components/ui/Icon';
import type { AdminRow, FieldConfig } from '@/components/admin/types';
import { checkImageFile } from '@/lib/upload-limits';
import { cn, toDateInputValue, toDateTimeInputValue } from '@/lib/utils';

// ========================================
// HELPERS TO CONVERT VALUES FOR HTML INPUTS
// ========================================
/** Turn whatever is in the database into something an <input> can show. */
function toInputValue(field: FieldConfig, row: AdminRow | null): string | boolean {
  const raw = row?.[field.name];

  // A radio group is a boolean in the database, exactly like a checkbox - the
  // only difference is how it is drawn.
  if (field.type === 'checkbox' || field.type === 'radio') return Boolean(raw);

  if (raw === null || raw === undefined) return '';

  if (field.type === 'date') return toDateInputValue(raw as string | Date);
  if (field.type === 'datetime') return toDateTimeInputValue(raw as string | Date);

  return String(raw);
}

/** Build the starting values for a new or existing record. */
export function buildInitialValues(
  fields: FieldConfig[],
  row: AdminRow | null,
  defaults: AdminRow = {},
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};

  for (const field of fields) {
    if (row) {
      values[field.name] = toInputValue(field, row);
    } else if (defaults[field.name] !== undefined) {
      values[field.name] = defaults[field.name] as string | boolean;
    } else {
      values[field.name] = field.type === 'checkbox' ? false : '';
    }
  }

  return values;
}

// ========================================
// THE FORM COMPONENT
// ========================================
export function ResourceForm({
  resourceKey,
  entityLabel,
  fields,
  row,
  defaults,
  onClose,
  onSaved,
}: {
  /** For example "programs". */
  resourceKey: string;
  /** For example "Program". Used in the heading and the messages. */
  entityLabel: string;
  fields: FieldConfig[];
  /** null = create a new record, otherwise the record being edited. */
  row: AdminRow | null;
  /** Values used when creating a new record. */
  defaults?: AdminRow;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isNew = row === null;

  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    buildInitialValues(fields, row, defaults ?? {}),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setValue = (name: string, value: string | boolean) => {
    setValues((current) => ({ ...current, [name]: value }));
    // Clear the error on this field as soon as the user changes it.
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  /** Should this field be visible right now? (used for showWhen) */
  const isVisible = (field: FieldConfig) => {
    if (!field.showWhen) return true;
    const dependency = values[field.showWhen.field];
    return field.showWhen.values.includes(String(dependency));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const endpoint = isNew
      ? `/api/admin/${resourceKey}`
      : `/api/admin/${resourceKey}/${String(row?.id ?? '')}`;

    try {
      const response = await fetch(endpoint, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | { ok: false; error: string; fields?: Record<string, string> }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setError(
          (payload && 'error' in payload && payload.error) ||
            'Could not save your changes. Please try again.',
        );
        if (payload && 'fields' in payload && payload.fields) setFieldErrors(payload.fields);
        return;
      }

      onSaved(payload.message || `${entityLabel} saved.`);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  // Group the fields into boxes (fields without a "section" go into the first box).
  const sections = new Map<string, FieldConfig[]>();
  for (const field of fields) {
    if (!isVisible(field)) continue;
    const key = field.section ?? '__main';
    const list = sections.get(key) ?? [];
    list.push(field);
    sections.set(key, list);
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true">
      {/* ---------- Dark background (click to close) ---------- */}
      <button
        type="button"
        aria-label="Close the form"
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ---------- The sliding panel ---------- */}
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-ink-900">
              {isNew ? `Add ${entityLabel.toLowerCase()}` : `Edit ${entityLabel.toLowerCase()}`}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {isNew
                ? 'Fill in the details and save. Nothing is shown on the public website until you switch on "Published".'
                : 'Change the values you need and save.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-2 text-ink-500 hover:bg-ink-100"
            aria-label="Close"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {/* data-resource-form tells the "Save" button in the footer which form to submit. */}
        <form
          data-resource-form="true"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5 sm:px-6"
        >
          {error ? (
            <Alert tone="error" className="mb-5">
              {error}
            </Alert>
          ) : null}

          <div className="space-y-6">
            {[...sections.entries()].map(([sectionName, sectionFields]) => (
              <div key={sectionName}>
                {sectionName !== '__main' ? (
                  <h3 className="mb-3 border-b border-ink-100 pb-2 text-sm font-bold text-ink-900">
                    {sectionName}
                  </h3>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {sectionFields.map((field) => (
                    <FieldRenderer
                      key={field.name}
                      field={field}
                      value={values[field.name]}
                      error={fieldErrors[field.name]}
                      onChange={(value) => setValue(field.name, value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Hidden submit button so pressing ENTER saves the form */}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>

        {/* Footer buttons */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-200 bg-ink-50 px-5 py-4 sm:px-6">
          <p className="text-xs text-ink-500">Fields marked * are required.</p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              onClick={() => {
                // Trigger the form's submit handler.
                const form = document.querySelector<HTMLFormElement>(
                  'form[data-resource-form="true"]',
                );
                if (form) form.requestSubmit();
              }}
            >
              {saving ? 'Saving…' : isNew ? `Add ${entityLabel.toLowerCase()}` : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ONE FIELD OF THE FORM
// ========================================
function FieldRenderer({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldConfig;
  value: string | boolean | undefined;
  error?: string;
  onChange: (value: string | boolean) => void;
}) {
  const spanClass = field.span === 1 ? 'sm:col-span-1' : 'sm:col-span-2';
  const type = field.type ?? 'text';

  // ---------- Radio group ----------
  // Used where "off" is a real, named state rather than an empty field - the
  // donor's Private / Public switch is the first example. The stored value is
  // still a boolean, so nothing about the API or the database changes.
  if (type === 'radio') {
    const options = field.options ?? [];

    return (
      <fieldset className={spanClass}>
        <legend className="mb-1.5 block text-sm font-medium text-ink-700">
          {field.label}
          {field.required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </legend>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          {options.map((option) => {
            const optionValue = option.value === 'true';
            const selected = Boolean(value) === optionValue;

            return (
              <label
                key={option.value}
                className={
                  'flex cursor-pointer items-start gap-2.5 rounded-btn border px-3.5 py-3 text-sm transition ' +
                  (selected
                    ? 'border-brand-500 bg-brand-50/60 text-ink-900 ring-1 ring-brand-500'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300')
                }
              >
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={selected}
                  onChange={() => onChange(optionValue)}
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                />
                <span className="leading-snug">{option.label}</span>
              </label>
            );
          })}
        </div>

        {field.hint ? <p className="mt-1.5 text-xs text-ink-500">{field.hint}</p> : null}
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </fieldset>
    );
  }

  // ---------- Checkbox ----------
  if (type === 'checkbox') {
    return (
      <CheckboxField
        name={field.name}
        label={field.label}
        description={field.hint}
        error={error}
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
        className={spanClass}
      />
    );
  }

  // ---------- Drop-down ----------
  if (type === 'select') {
    return (
      <SelectField
        name={field.name}
        label={field.label}
        required={field.required}
        hint={field.hint}
        error={error}
        options={field.options ?? []}
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
        className={spanClass}
      />
    );
  }

  // ---------- Image address + preview + upload ----------
  if (type === 'image') {
    return (
      <div className={spanClass}>
        <TextField
          name={field.name}
          label={field.label}
          required={field.required}
          hint={field.hint ?? 'Paste a link to an image that is already online.'}
          error={error}
          placeholder="https://... or /uploads/..."
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />

        {/* Preview of the picture */}
        {String(value ?? '').trim() !== '' ? (
          <div className="mt-3 overflow-hidden rounded-card border border-ink-200 bg-ink-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={String(value)}
              alt="Preview"
              className="h-40 w-full object-contain"
              loading="lazy"
            />
          </div>
        ) : null}

        {/* Upload button (works while developing on your own computer) */}
        {field.uploadable ? <ImageUploader onUploaded={(url) => onChange(url)} /> : null}
      </div>
    );
  }

  // ---------- Multi-line text ----------
  if (type === 'textarea' || type === 'lines') {
    return (
      <TextareaField
        name={field.name}
        label={field.label}
        required={field.required}
        hint={field.hint}
        error={error}
        rows={type === 'lines' ? 5 : 6}
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
        className={spanClass}
      />
    );
  }

  // ---------- Date / time ----------
  if (type === 'date' || type === 'datetime') {
    return (
      <TextField
        name={field.name}
        label={field.label}
        type={type === 'date' ? 'date' : 'datetime-local'}
        required={field.required}
        hint={field.hint}
        error={error}
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
        className={spanClass}
      />
    );
  }

  // ---------- Password with a "generate" helper ----------
  // Why a button instead of generating silently on the server: the value stays
  // VISIBLE in the field, so the administrator can read it out or write it down
  // and only then save. A password that is shown for a few seconds and then
  // disappears (or that nobody ever saw) is worse than useless.
  if (type === 'password' && field.generatePassword) {
    return (
      <div className={spanClass}>
        <TextField
          name={field.name}
          label={field.label}
          type="text"
          required={field.required}
          hint={field.hint}
          error={error}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-btn border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
            onClick={() => onChange(makeStartingPassword())}
          >
            Generate a password
          </button>
          <span className="text-xs text-ink-500">
            It appears in the box above. Write it down before saving - it is never shown again.
          </span>
        </div>
      </div>
    );
  }

  // ---------- Number / plain text / email / url / password ----------
  const inputType =
    type === 'number'
      ? 'number'
      : type === 'email'
        ? 'email'
        : type === 'url'
          ? 'url'
          : type === 'password'
            ? 'password'
            : 'text';

  return (
    <TextField
      name={field.name}
      label={field.label}
      type={inputType}
      required={field.required}
      hint={field.hint}
      error={error}
      placeholder={field.placeholder}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.target.value)}
      className={spanClass}
    />
  );
}

// ========================================
// A READABLE STARTING PASSWORD
// ========================================
// Three short words plus two digits: easy to read out over the phone, and much
// safer than "password123". It is only ever a starting point - the member is
// asked to change it after the first sign-in.
const STARTING_WORDS = [
  'Himal', 'Koshi', 'Gandaki', 'Bagmati', 'Lumbini', 'Karnali', 'Sudur',
  'Surya', 'Chandra', 'Tara', 'Phool', 'Ghat', 'Khet', 'Bagaicha', 'Pahad',
  'Rato', 'Hariyo', 'Nil', 'Seto', 'Sano', 'Thulo', 'Naya', 'Purano',
];

function makeStartingPassword(): string {
  const pick = () => STARTING_WORDS[Math.floor(Math.random() * STARTING_WORDS.length)];
  const digits = String(Math.floor(10 + Math.random() * 90));
  return `${pick()}-${pick()}${digits}`;
}

// ========================================
// IMAGE UPLOAD BUTTON
// ========================================
function ImageUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // ---------- 4 MB rule, checked BEFORE the upload starts ----------
    // The server checks this again (lib/storage.ts). This only saves the person
    // from waiting for a large file to travel and then be refused.
    const check = checkImageFile(file);
    if (!check.ok) {
      setMessage(check.error);
      event.target.value = '';
      return;
    }

    setBusy(true);
    setMessage(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; data: { url: string } }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setMessage(
          (payload && 'error' in payload && payload.error) || 'The upload did not work.',
        );
        return;
      }

      onUploaded(payload.data.url);
      setMessage('Uploaded. Remember to save the form.');
    } catch {
      setMessage('Could not upload the file. Please try pasting an image link instead.');
    } finally {
      setBusy(false);
      // Allow uploading the same file again later.
      event.target.value = '';
    }
  }

  return (
    <div className="mt-3">
      <label
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 rounded-btn border border-dashed border-ink-300 px-3 py-2 text-xs font-medium text-ink-600',
          'hover:border-brand-400 hover:text-brand-700',
          busy && 'opacity-60',
        )}
      >
        <Icon name="upload" className="h-3.5 w-3.5" />
        {busy ? 'Uploading…' : 'Upload an image file'}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="sr-only-text"
          onChange={handleFile}
          disabled={busy}
        />
      </label>

      {message ? <p className="mt-1.5 text-xs text-ink-500">{message}</p> : null}
    </div>
  );
}
