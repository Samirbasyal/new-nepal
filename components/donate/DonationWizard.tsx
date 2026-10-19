// ========================================
// DONATION - STEP 2 AND 3 (purpose, then donor details)
// ========================================
// WHY THIS IS ONE COMPONENT WITH TWO STEPS
//   The donor's answers must survive pressing "Back". Keeping both steps in one
//   component means the name, email and number are still in memory when the
//   donor returns to the purpose list - no half-filled form, no lost typing.
//
// WHAT IT SENDS, AND WHEN
//   Nothing leaves the browser until "Continue to Payment" is pressed. Only then
//   does /api/donations/draft create the record, and the page moves to the
//   payment step with the reference it returns.
//
// WHAT IT NEVER DOES
//   It never decides a status, never sends an amount, and never touches the
//   monthly member fund. The purpose codes come from lib/donation/purposes.ts -
//   the same list the server validates against.
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HoneypotField, SelectField, TextField, TextareaField } from '@/components/forms/Field';
import { COUNTRY_CODES } from '@/lib/donation/publicSchemas';
import { DONATION_PURPOSES, findPurpose } from '@/lib/donation/purposes';
import { cn } from '@/lib/utils';

/** The four stops of the journey, as shown in the progress bar. */
const JOURNEY = ['Purpose', 'Details', 'Payment', 'Verification'];

const STEP_INDEX = {
  purpose: 0,
  details: 1,
} as const;

type Step = keyof typeof STEP_INDEX;
type Errors = Record<string, string>;

/** What a signed-in donor already has on file. Every field stays editable. */
export type DonorPrefill = {
  name?: string;
  email?: string;
  /** "+977 9812345678" as stored on the account, split up again below. */
  phone?: string;
};

/** Split "+977 9812345678" back into a country code and a number. */
function splitPhone(value?: string): { code: string; number: string } {
  const text = (value ?? '').trim();
  const match = /^\+(\d{1,4})\s*(.*)$/.exec(text);
  if (!match) return { code: '977', number: text.replace(/[^\d]/g, '') };
  return { code: match[1], number: match[2].replace(/[^\d]/g, '') };
}

export function DonationWizard({ prefill }: { prefill?: DonorPrefill }) {
  const router = useRouter();

  const [step, setStep] = useState<Step>('purpose');

  // ---------- Answers, kept for the whole journey ----------
  // A signed-in donor finds their own details already filled in - they can still
  // change every one of them, because a gift is sometimes made on behalf of
  // somebody else.
  const [purpose, setPurpose] = useState('');
  const [purposeDetail, setPurposeDetail] = useState('');
  const [donorName, setDonorName] = useState(prefill?.name ?? '');
  const [donorEmail, setDonorEmail] = useState(prefill?.email ?? '');
  const [countryCode, setCountryCode] = useState(splitPhone(prefill?.phone).code);
  const [phone, setPhone] = useState(splitPhone(prefill?.phone).number);
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // findPurpose() hands back the WIDE option type. Reading the list directly
  // gives a union of literals, and TypeScript then refuses to see the optional
  // asksForOwnWords that only the "Other" entry carries.
  const chosen = findPurpose(purpose);
  const current = STEP_INDEX[step];

  // ========================================
  // Step 1 -> Step 2
  // ========================================
  function goToDetails() {
    if (!purpose) {
      setErrors({ purpose: 'Please choose what your donation is for.' });
      return;
    }

    setErrors({});
    setStep('details');
    // Move the screen to the top so the summary is the first thing seen.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ========================================
  // Step 2 -> the payment page
  // ========================================
  function validateDetails(): Errors {
    const found: Errors = {};

    if (donorName.trim().length < 2) found.donorName = 'Please enter your full name.';

    // Same shape as the server rule, so the two can never disagree.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(donorEmail.trim())) {
      found.donorEmail = 'Please enter a valid email address.';
    }

    const digits = phone.replace(/[\s()-]/g, '');
    if (!/^\d{6,15}$/.test(digits)) {
      found.phone = 'Please enter the mobile number using digits only (6 to 15 digits).';
    }

    return found;
  }

  async function continueToPayment() {
    const found = validateDetails();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setErrors({});
    setFailure(null);
    setBusy(true);

    try {
      const response = await fetch('/api/donations/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          purposeDetail: purposeDetail.trim() || null,
          donorName: donorName.trim(),
          donorEmail: donorEmail.trim(),
          countryCode,
          phone,
          message: message.trim() || null,
          website,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setFailure(payload?.error ?? 'We could not save your details. Please try again.');
        return;
      }

      const reference = payload.data?.reference as string | undefined;
      if (!reference) {
        setFailure('We could not save your details. Please try again.');
        return;
      }

      router.push(`/donate/pay/${reference}`);
    } catch {
      setFailure('We could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* ========================================
          PROGRESS
          ======================================== */}
      <ol className="flex flex-wrap items-center gap-y-3">
        {JOURNEY.map((label, index) => {
          const done = index < current;
          const active = index === current;

          return (
            <li key={label} className="flex items-center">
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  done ? 'bg-brand-600 text-white' : '',
                  active ? 'bg-brand-600 text-white ring-4 ring-brand-100' : '',
                  !done && !active ? 'bg-ink-100 text-ink-500' : '',
                )}
                aria-hidden="true"
              >
                {done ? <Icon name="check" className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'ml-2 text-xs font-semibold sm:text-sm',
                  active ? 'text-ink-900' : 'text-ink-500',
                )}
              >
                {label}
              </span>
              {index < JOURNEY.length - 1 ? (
                <span className="mx-2 hidden h-px w-6 bg-ink-200 sm:block sm:w-10" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* ========================================
          STEP 1 - PURPOSE
          ======================================== */}
      {step === 'purpose' ? (
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold text-ink-900">
            What would you like to support?
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Choose the cause closest to your heart. You can add your own words at the end of this list.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DONATION_PURPOSES.map((option) => {
              const selected = purpose === option.code;

              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setPurpose(option.code);
                    setErrors({});
                  }}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-start gap-3 rounded-card border p-4 text-left transition',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    selected
                      ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500'
                      : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/30',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card',
                      selected ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-600',
                    )}
                  >
                    <Icon name={option.icon} className="h-5 w-5" />
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink-900">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-600">
                      {option.description}
                    </span>
                  </span>

                  {selected ? (
                    <Icon name="check-circle" className="ml-auto h-5 w-5 shrink-0 text-brand-600" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* "Other" asks the donor to explain, because "Other" alone tells the
              office nothing about what the money is for. */}
          {chosen?.asksForOwnWords ? (
            <div className="mt-5">
              <TextareaField
                label="Please tell us what you would like to support"
                name="purposeDetail"
                hint="Optional, but it helps us use your gift the way you intended."
                rows={3}
                maxLength={300}
                value={purposeDetail}
                onChange={(event) => setPurposeDetail(event.target.value)}
              />
            </div>
          ) : null}

          {errors.purpose ? (
            <div className="mt-4">
              <Alert tone="error">{errors.purpose}</Alert>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="primary" size="lg" onClick={goToDetails}>
              Continue
              <Icon name="chevron-right" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* ========================================
          STEP 2 - DONOR DETAILS
          ======================================== */}
      {step === 'details' ? (
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold text-ink-900">Your details</h2>
          <p className="mt-1 text-sm text-ink-600">
            We use these only to confirm your donation and to reach you if something is unclear.
          </p>

          {/* ---------- The chosen purpose, restated ---------- */}
          <div className="mt-5 flex items-start gap-3 rounded-card border border-brand-200 bg-brand-50/60 p-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-600 text-white">
              <Icon name={chosen?.icon ?? 'heart'} className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                Your donation will support
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink-900">{chosen?.label ?? purpose}</p>
              {chosen?.asksForOwnWords && purposeDetail.trim() !== '' ? (
                <p className="mt-1 text-xs text-ink-600">{purposeDetail}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setStep('purpose')}
              className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
            >
              Change
            </button>
          </div>

          {/* ---------- The form ---------- */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label="Full name"
                name="donorName"
                required
                autoComplete="name"
                placeholder="Your full name"
                value={donorName}
                onChange={(event) => setDonorName(event.target.value)}
                error={errors.donorName}
              />
            </div>

            <TextField
              label="Email address"
              name="donorEmail"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              hint="Your receipt and status updates go here."
              value={donorEmail}
              onChange={(event) => setDonorEmail(event.target.value)}
              error={errors.donorEmail}
            />

            <div className="grid grid-cols-[7.5rem_1fr] gap-3">
              <SelectField
                label="Code"
                name="countryCode"
                options={COUNTRY_CODES.map((country) => ({
                  value: country.code,
                  label: `+${country.code}`,
                }))}
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
              />

              <TextField
                label="Mobile number"
                name="phone"
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                error={errors.phone}
              />
            </div>

            <div className="sm:col-span-2">
              <TextareaField
                label="Reason or message for your donation"
                name="message"
                hint="Optional. Anything you would like the office to know."
                rows={3}
                maxLength={1000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-1">
            <HoneypotField value={website} onChange={setWebsite} />
          </div>

          {failure ? (
            <div className="mt-4">
              <Alert tone="error">{failure}</Alert>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={continueToPayment}
              disabled={busy}
            >
              {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Continue to Payment'}
              {busy ? null : <Icon name="chevron-right" className="h-4 w-4" />}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setStep('purpose')}
              disabled={busy}
            >
              Back
            </Button>
          </div>

          <p className="mt-3 text-xs text-ink-500">
            No money is taken on this page. You will choose the amount and the payment method next.
          </p>
        </div>
      ) : null}
    </div>
  );
}
