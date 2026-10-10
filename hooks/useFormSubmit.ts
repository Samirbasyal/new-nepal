// ========================================
// FORM SUBMISSION HOOK
// ========================================
// A small reusable piece of logic shared by every form on the website
// (login, register, join community, contact, profile...).
//
// It handles the boring parts so each form file stays short:
//   - showing the "sending..." state while the request is in progress
//   - reading the server answer
//   - showing field-by-field error messages under the right input boxes
//   - showing the success message
//   - handling a lost internet connection gracefully
//
// "use client" is required because a form reacts to what the visitor types.
// ========================================

'use client';

import { useCallback, useState } from 'react';

export type SubmitOptions = {
  /** Called after a successful save (for example to redirect the user). */
  onSuccess?: (data: unknown, message: string) => void;
};

export function useFormSubmit(endpoint: string) {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const reset = useCallback(() => {
    setSuccess(null);
    setError(null);
    setFieldErrors({});
  }, []);

  const submit = useCallback(
    async (values: Record<string, unknown>, options: SubmitOptions = {}) => {
      setBusy(true);
      setError(null);
      setSuccess(null);
      setFieldErrors({});

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        // The API always answers with JSON, but be defensive anyway.
        const payload = (await response.json().catch(() => null)) as
          | { ok: true; data: unknown; message?: string }
          | { ok: false; error: string; fields?: Record<string, string> }
          | null;

        if (!response.ok || !payload || payload.ok !== true) {
          const message =
            (payload && 'error' in payload && payload.error) ||
            'Something went wrong. Please try again.';
          setError(message);
          if (payload && 'fields' in payload && payload.fields) {
            setFieldErrors(payload.fields);
          }
          return false;
        }

        const message = payload.message ?? 'Saved successfully.';
        setSuccess(message);
        options.onSuccess?.(payload.data, message);
        return true;
      } catch {
        // fetch() only fails like this when the browser cannot reach the server.
        setError('Could not reach the server. Please check your connection and try again.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [endpoint],
  );

  return { busy, success, error, fieldErrors, submit, reset };
}
