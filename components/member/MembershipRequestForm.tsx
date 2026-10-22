// ========================================
// MEMBER PORTAL - "REQUEST MEMBERSHIP" FORM
// ========================================
// The public form somebody fills in to ASK to join the club.
//
// WHAT IT DOES NOT DO (important)
//   Submitting this form does not create an account, does not set a password and
//   does not sign anybody in. The request waits in the Admin Panel until an
//   administrator approves it, and only then can the applicant activate an
//   account. That is why the success screen says "wait for the administrator"
//   rather than "welcome".
//
// HOW THE FORM BEHAVES
//   - It checks the answers in the browser using the SAME schema the server uses
//     (lib/membership/schemas.ts), so most mistakes are caught before uploading.
//   - The server checks everything again. A browser check is a courtesy; the
//     server check is the rule.
//   - NOTHING IS CLEARED when something is wrong. A person who typed a long
//     request letter must never lose it because one field was missed.
//   - The photo travels with the form (multipart), so a failure cannot leave an
//     orphan picture behind.
// ========================================

'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CheckboxField, TextField, TextareaField } from '@/components/forms/Field';
import { Icon } from '@/components/ui/Icon';
import { membershipRequestSchema, type MembershipRequestInput } from '@/lib/membership/schemas';
import { checkImageFile, IMAGE_ACCEPT } from '@/lib/upload-limits';

type Values = {
  fullName: string;
  email: string;
  mobileNumber: string;
  currentAddress: string;
  dateOfBirth: string;
  occupation: string;
  reasonForJoining: string;
  requestLetter: string;
  agree: boolean;
};

const EMPTY: Values = {
  fullName: '',
  email: '',
  mobileNumber: '',
  currentAddress: '',
  dateOfBirth: '',
  occupation: '',
  reasonForJoining: '',
  requestLetter: '',
  agree: false,
};

export function MembershipRequestForm({ onSwitchToLogin }: { onSwitchToLogin?: () => void }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // The optional fields stay out of sight until asked for, so the form shows only
  // what the committee needs to decide. Nothing is removed from the backend.
  const [showOptional, setShowOptional] = useState(false);
  const [done, setDone] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear the message for the field being corrected, so the form does not look
    // broken after somebody has already fixed it.
    setFieldErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  function choosePhoto(file: File | null) {
    setPhotoError(null);

    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      if (fileInput.current) fileInput.current.value = '';
      return;
    }

    const check = checkImageFile(file);
    if (!check.ok) {
      setPhotoError(check.error);
      setPhoto(null);
      setPhotoPreview(null);
      if (fileInput.current) fileInput.current.value = '';
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // ---------- 1. Check in the browser, with the server's own rules ----------
    const parsed = membershipRequestSchema.safeParse(values);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'form';
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setError('Please check the highlighted boxes and send the form again.');
      return;
    }

    // ---------- 2. Send it ----------
    setBusy(true);

    try {
      const form = new FormData();
      const data: MembershipRequestInput = parsed.data;
      form.set('fullName', data.fullName);
      form.set('email', data.email);
      form.set('mobileNumber', data.mobileNumber);
      form.set('currentAddress', data.currentAddress);
      form.set('dateOfBirth', data.dateOfBirth);
      form.set('occupation', data.occupation);
      form.set('reasonForJoining', data.reasonForJoining);
      form.set('requestLetter', data.requestLetter);
      form.set('agree', String(data.agree));
      if (photo) form.set('photo', photo);

      const response = await fetch('/api/membership-requests', { method: 'POST', body: form });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | { ok: false; error: string; fields?: Record<string, string> }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setError(
          (payload && 'error' in payload && payload.error) ||
            'The request could not be sent. Please check your connection and try again.',
        );
        if (payload && 'fields' in payload && payload.fields) setFieldErrors(payload.fields);
        return;
      }

      // Only now is it safe to forget what was typed.
      setDone(true);
      setValues(EMPTY);
      setPhoto(null);
      setPhotoPreview(null);
      setFieldErrors({});
    } catch {
      setError(
        'Could not reach the server. Please check your connection and send the form again - your answers are still here.',
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // THE SUCCESS SCREEN
  // ========================================
  // The exact sentence the organization asked for, and a plain explanation of
  // what happens next. No confetti, no "you are a member now" - because they
  // are not one yet.
  if (done) {
    return (
      <div className="space-y-5">
        <div className="rounded-card border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              <Icon name="check" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-green-900">Request sent</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-green-900">
                Your membership request has been submitted successfully. Please wait for the
                administrator to review and approve your request.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">What happens next</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
            <li>The office reviews your application.</li>
            <li>
              If it is approved, you receive an email with a private link to create your password.
            </li>
            <li>You choose your own password - nobody at the club ever sees it.</li>
            <li>You sign in on the Login tab and the member dashboard opens.</li>
          </ol>
          <p className="mt-3 text-xs text-ink-500">
            Your request stays pending until an administrator decides. You cannot sign in before
            that, so there is no need to try.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="primary" className="sm:flex-1" onClick={() => setDone(false)}>
            Send another request
          </Button>
          {onSwitchToLogin ? (
            <Button type="button" variant="outline" className="sm:flex-1" onClick={onSwitchToLogin}>
              Go to login
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // ========================================
  // THE FORM
  // ========================================
  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* ---------- Who you are ---------- */}
      <fieldset className="space-y-4">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
          Your details
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Full name"
            name="fullName"
            required
            autoComplete="name"
            placeholder="As written on your citizenship document"
            value={values.fullName}
            onChange={(event) => set('fullName', event.target.value)}
            error={fieldErrors.fullName}
          />

          <TextField
            label="Mobile number"
            name="mobileNumber"
            required
            type="tel"
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            value={values.mobileNumber}
            onChange={(event) => set('mobileNumber', event.target.value)}
            error={fieldErrors.mobileNumber}
          />
        </div>

        <TextField
          label="Email address"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          hint="Your approval and activation link are sent to this address, so please check it carefully."
          value={values.email}
          onChange={(event) => set('email', event.target.value)}
          error={fieldErrors.email}
        />

        <TextField
          label="Current address"
          name="currentAddress"
          required
          autoComplete="street-address"
          placeholder="Village / ward, municipality, district"
          value={values.currentAddress}
          onChange={(event) => set('currentAddress', event.target.value)}
          error={fieldErrors.currentAddress}
        />

        <button
          type="button"
          onClick={() => setShowOptional((value) => !value)}
          className="text-left text-xs font-semibold text-brand-700 hover:underline"
        >
          {showOptional ? 'Hide optional details' : '+ Add optional details (date of birth, occupation, photo)'}
        </button>

        {showOptional ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            hint="Optional"
            value={values.dateOfBirth}
            onChange={(event) => set('dateOfBirth', event.target.value)}
            error={fieldErrors.dateOfBirth}
          />

          <TextField
            label="Occupation"
            name="occupation"
            hint="Optional - for example student, farmer, teacher"
            value={values.occupation}
            onChange={(event) => set('occupation', event.target.value)}
            error={fieldErrors.occupation}
          />
        </div>
        ) : null}
      </fieldset>

      {/* ---------- Why you want to join ---------- */}
      <fieldset className="space-y-4 border-t border-ink-100 pt-5">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
          Your request
        </legend>

        <TextField
          label="Reason for joining the club"
          name="reasonForJoining"
          required
          placeholder="One line, for example: I want to help with education programmes in my ward"
          value={values.reasonForJoining}
          onChange={(event) => set('reasonForJoining', event.target.value)}
          error={fieldErrors.reasonForJoining}
        />

        <TextareaField
          label="Request letter"
          name="requestLetter"
          required
          rows={7}
          placeholder="Write to the committee in your own words: who you are, what you would like to do for the community, and how much time you can give."
          hint="This letter goes to the committee exactly as you write it."
          value={values.requestLetter}
          onChange={(event) => set('requestLetter', event.target.value)}
          error={fieldErrors.requestLetter}
        />
      </fieldset>

      {/* ---------- Optional photo ---------- */}
      <fieldset className={showOptional ? 'space-y-3 border-t border-ink-100 pt-5' : 'hidden'}>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
          Profile photo <span className="font-medium normal-case text-ink-400">(optional)</span>
        </legend>

        <div className="flex items-center gap-4">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-ink-400 ring-1 ring-ink-200">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Your chosen photo" className="h-full w-full object-cover" />
            ) : (
              <Icon name="user" className="h-7 w-7" />
            )}
          </span>

          <div className="min-w-0">
            <input
              ref={fileInput}
              id="profilePhoto"
              name="profilePhoto"
              type="file"
              accept={IMAGE_ACCEPT}
              className="block w-full text-xs text-ink-600 file:mr-3 file:rounded-btn file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700"
              onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-ink-500">JPG, PNG, WEBP or GIF, up to 4 MB.</p>

            {photo ? (
              <button
                type="button"
                onClick={() => choosePhoto(null)}
                className="mt-1 text-xs font-semibold text-red-600 hover:underline"
              >
                Remove this photo
              </button>
            ) : null}
          </div>
        </div>

        {photoError ? <p className="field-error">{photoError}</p> : null}
        {fieldErrors.profilePhoto ? <p className="field-error">{fieldErrors.profilePhoto}</p> : null}
      </fieldset>

      {/* ---------- Consent ---------- */}
      {/*
        DELIBERATELY SHORT.

        An earlier version listed five numbered "membership rules" here (monthly
        fund, attendance, the committee's decision being final...). Those sentences
        were written by whoever built the form, not by the club - and a website
        form is the wrong place to state policy, because it would then contradict
        the club's own written rules the moment they change.

        So the form now asks for ONE agreement and points at the documents the club
        actually publishes. The wording of the policy lives there, in the club's own
        words, and nobody has to keep two versions of it in step.
      */}
      <fieldset className="space-y-3 border-t border-ink-100 pt-5">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Consent</legend>

        <CheckboxField
          label="I agree to the club's terms"
          name="agree"
          checked={values.agree}
          onChange={(event) => set('agree', event.target.checked)}
          error={fieldErrors.agree}
        />

        <p className="text-xs leading-relaxed text-ink-500">
          Please read the club&apos;s own{' '}
          <Link href="/terms" className="font-semibold text-brand-700 hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-semibold text-brand-700 hover:underline">
            Privacy policy
          </Link>{' '}
          before you send this request. Those pages are the club&apos;s wording - this form does not
          replace them.
        </p>
      </fieldset>

      <div className="space-y-3 border-t border-ink-100 pt-5">
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? (
            <span className="inline-flex items-center gap-2 text-accent-100" role="status">
              <Icon name="refresh" className="h-4 w-4 animate-spin" />
              Sending your request...
            </span>
          ) : (
            <>
              <Icon name="user-plus" className="h-4 w-4" />
              Submit Membership Request
            </>
          )}
        </Button>

        <p className="text-center text-xs text-ink-500">
          Already approved and activated?{' '}
          <a href="/member/portal?tab=login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </a>
          . The office can also be reached through the{' '}
          <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
            contact page
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
