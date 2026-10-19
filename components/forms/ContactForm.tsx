// ========================================
// CONTACT FORM
// ========================================
// The public form on the /contact page.
//
// WHAT HAPPENS AFTER SUBMISSION
//   1. The message is validated on the server.
//   2. It is saved in the "contact_messages" database table.
//   3. The sender sees a confirmation.
//   4. Administrators read and manage it in
//      Admin Panel -> Contact messages.
//
// The form deliberately says "we will reply" instead of promising an automatic
// e-mail, because this project does not send e-mail by itself. If you later
// connect an e-mail service, add it inside app/api/contact/route.ts.
// ========================================

'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { HoneypotField, TextField, TextareaField } from '@/components/forms/Field';
import { Icon } from '@/components/ui/Icon';
import { useFormSubmit } from '@/hooks/useFormSubmit';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

export function ContactForm() {
  const [values, setValues] = useState({ ...EMPTY });
  const [honeypot, setHoneypot] = useState('');
  const { busy, success, error, fieldErrors, submit } = useFormSubmit('/api/contact');

  const update = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return submit({ ...values, website: honeypot }, { onSuccess: () => setValues({ ...EMPTY }) });
  }

  // ---------- Success screen ----------
  if (success) {
    return (
      <div className="card p-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-green-200">
          <Icon name="check-circle" className="h-7 w-7" />
        </span>

        <h2 className="text-xl font-bold text-ink-900">Message sent</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">
          Thank you for getting in touch. Our team has received your message and will reply as soon
          as possible.
        </p>

        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setValues({ ...EMPTY });
            window.location.reload();
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  // ---------- The form ----------
  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8" noValidate>
      {error ? <Alert tone="error">{error}</Alert> : null}

      <HoneypotField value={honeypot} onChange={setHoneypot} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="Your name"
          name="name"
          required
          autoComplete="name"
          value={values.name}
          onChange={update('name')}
          error={fieldErrors.name}
        />

        <TextField
          label="Email address"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={values.email}
          onChange={update('email')}
          error={fieldErrors.email}
        />

        <TextField
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          hint="Optional"
          value={values.phone}
          onChange={update('phone')}
          error={fieldErrors.phone}
        />

        <TextField
          label="Subject"
          name="subject"
          hint="Optional"
          value={values.subject}
          onChange={update('subject')}
          error={fieldErrors.subject}
        />
      </div>

      <TextareaField
        label="Your message"
        name="message"
        required
        rows={6}
        placeholder="How can we help you?"
        value={values.message}
        onChange={update('message')}
        error={fieldErrors.message}
      />

      <div className="flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500">
          Your message is stored securely and read only by our administrators.
        </p>

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Send message'}
        </Button>
      </div>
    </form>
  );
}
