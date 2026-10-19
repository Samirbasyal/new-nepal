// ========================================
// JOIN COMMUNITY FORM
// ========================================
// The public form on the /join page.
//
// WHAT HAPPENS AFTER SUBMISSION
//   1. The details are validated on the server (lib/validation/schemas.ts).
//   2. They are saved in the "join_applications" database table.
//   3. The applicant sees a success message.
//   4. The application appears ONLY inside the Admin Panel
//      (Admin Panel -> Join applications), where it can be searched,
//      filtered and given a status (New / Reviewing / Approved / Rejected).
//
// PRIVACY: nothing from this form is ever shown on the public website.
// ========================================

'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { HoneypotField, SelectField, TextField, TextareaField } from '@/components/forms/Field';
import { Icon } from '@/components/ui/Icon';
import { AREA_OF_INTEREST_OPTIONS } from '@/lib/constants';
import { useFormSubmit } from '@/hooks/useFormSubmit';

const EMPTY = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  areaOfInterest: '',
  message: '',
  extraInfo: '',
};

export function JoinForm() {
  const [values, setValues] = useState({ ...EMPTY });
  const [honeypot, setHoneypot] = useState('');
  const { busy, success, error, fieldErrors, submit } = useFormSubmit('/api/join');

  const update = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const succeeded = await submit({ ...values, website: honeypot }, {
      onSuccess: () => setValues({ ...EMPTY }),
    });
    return succeeded;
  }

  // ---------- Success screen ----------
  if (success) {
    return (
      <div className="card p-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-green-200">
          <Icon name="check-circle" className="h-7 w-7" />
        </span>

        <h2 className="text-xl font-bold text-ink-900">Thank you for joining</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">{success}</p>

        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setValues({ ...EMPTY });
            window.location.reload();
          }}
        >
          Submit another application
        </Button>
      </div>
    );
  }

  // ---------- The form ----------
  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8" noValidate>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* Hidden anti-spam field (real visitors never see or fill it) */}
      <HoneypotField value={honeypot} onChange={setHoneypot} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="fullName"
          required
          autoComplete="name"
          placeholder="Your full name"
          value={values.fullName}
          onChange={update('fullName')}
          error={fieldErrors.fullName}
        />

        <TextField
          label="Phone number"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="98XXXXXXXX"
          value={values.phone}
          onChange={update('phone')}
          error={fieldErrors.phone}
        />

        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          hint="Optional, but it helps us reply to you."
          value={values.email}
          onChange={update('email')}
          error={fieldErrors.email}
        />

        <TextField
          label="Address / Ward / Municipality"
          name="address"
          autoComplete="street-address"
          placeholder="Where are you based?"
          value={values.address}
          onChange={update('address')}
          error={fieldErrors.address}
        />
      </div>

      <SelectField
        label="Area of interest"
        name="areaOfInterest"
        placeholder="Choose what interests you"
        options={AREA_OF_INTEREST_OPTIONS.map((item) => ({ value: item, label: item }))}
        value={values.areaOfInterest}
        onChange={update('areaOfInterest')}
        error={fieldErrors.areaOfInterest}
      />

      <TextareaField
        label="Why would you like to join?"
        name="message"
        placeholder="Tell us a little about yourself and how you would like to help."
        value={values.message}
        onChange={update('message')}
        error={fieldErrors.message}
      />

      <TextareaField
        label="Anything else you would like us to know?"
        name="extraInfo"
        rows={3}
        placeholder="Optional"
        value={values.extraInfo}
        onChange={update('extraInfo')}
        error={fieldErrors.extraInfo}
      />

      <div className="flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500">
          Your details are stored securely and are only visible to our administrators.
        </p>

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Submit application'}
        </Button>
      </div>
    </form>
  );
}
