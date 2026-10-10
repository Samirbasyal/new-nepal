// ========================================
// FORM FIELD COMPONENTS
// ========================================
// Small, consistent form controls used by every form on the website.
//
// They exist so that all forms look the same, are keyboard friendly and show
// their error message in the same place.
//
// ACCESSIBILITY NOTES (important and easy to miss)
//   - Every input has a real <label> connected by htmlFor / id.
//   - When there is an error we set aria-invalid and describe it with
//     aria-describedby so screen readers read the problem out loud.
// ========================================

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BaseProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
};

// ========================================
// SINGLE LINE TEXT INPUT
// ========================================
export function TextField({
  label,
  name,
  error,
  hint,
  required,
  className,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>

      <input
        id={name}
        name={name}
        className={cn('input', error && 'input-error')}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hint && hintId) || undefined}
        {...rest}
      />

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

// ========================================
// MULTI-LINE TEXTAREA
// ========================================
export function TextareaField({
  label,
  name,
  error,
  hint,
  required,
  className,
  ...rest
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const errorId = `${name}-error`;

  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>

      <textarea
        id={name}
        name={name}
        rows={5}
        className={cn('input resize-y', error && 'input-error')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />

      {hint && !error ? <p className="field-help">{hint}</p> : null}

      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ========================================
// DROP-DOWN (SELECT)
// ========================================
export function SelectField({
  label,
  name,
  error,
  hint,
  required,
  options,
  placeholder,
  className,
  ...rest
}: BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
    placeholder?: string;
  }) {
  const errorId = `${name}-error`;

  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>

      <select
        id={name}
        name={name}
        className={cn('input', error && 'input-error')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hint && !error ? <p className="field-help">{hint}</p> : null}

      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ========================================
// CHECKBOX (used for "keep me signed in", "publish", ...)
// ========================================
export function CheckboxField({
  label,
  name,
  description,
  error,
  className,
  ...rest
}: {
  label: string;
  name: string;
  description?: string;
  error?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="flex cursor-pointer items-start gap-3">
        <input
          id={name}
          name={name}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          {...rest}
        />
        <span>
          <span className="text-sm font-medium text-ink-800">{label}</span>
          {description ? (
            <span className="block text-xs text-ink-500">{description}</span>
          ) : null}
        </span>
      </label>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

// ========================================
// FORM LAYOUT HELPERS
// ========================================
/** A bordered box that groups related fields with a title. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('rounded-card border border-ink-200 bg-white p-5', className)}>
      <legend className="px-1 text-sm font-bold text-ink-900">{title}</legend>
      {description ? <p className="mb-4 text-xs text-ink-500">{description}</p> : null}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

/**
 * The hidden "honeypot" field used to block simple spam robots.
 * Real people never see it, so anything typed into it must be a robot.
 */
export function HoneypotField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="hidden" aria-hidden="true">
      <label htmlFor="website">Do not fill this box</label>
      <input
        id="website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
