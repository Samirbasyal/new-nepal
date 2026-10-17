// ========================================
// PASSWORD FIELD WITH A SHOW / HIDE BUTTON
// ========================================
// A password box that can be read back. Typing a long password twice on a phone
// is where most sign-ups fail, and hiding it permanently means the person cannot
// see that they have mistyped a letter.
//
// HOW IT STAYS SAFE
//   The value is never copied anywhere: the toggle only switches the input type
//   between "password" and "text". Nothing is sent, stored or logged either way.
//
// WHY IT IS ITS OWN FILE
//   The other fields in components/forms/Field.tsx are plain controls with no
//   state. This one remembers whether the password is visible, which needs
//   useState - so it is a client component, and keeping it separate stops every
//   simple text input on the site from being pulled into the browser bundle.
//
// ACCESSIBILITY
//   The toggle is a real button with an aria-label that changes with the state,
//   so a screen reader announces "Show password" / "Hide password" rather than an
//   unnamed icon. It also carries aria-pressed.
// ========================================

'use client';

import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordField({ label, name, error, hint, required, className, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>

      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          className={cn('input pr-11', error && 'input-error')}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error && errorId, hint && hintId) || undefined}
          {...rest}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-card text-ink-400 transition hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} className="h-5 w-5" />
        </button>
      </div>

      {hint && !error ? (
        <p id={hintId} className="field-help">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
