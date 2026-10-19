// ========================================
// ADMIN PANEL - LOAN PANELS (appear on /admin/loans/<id>)
// ========================================
// Three small panels, all of which send something to the server:
//
//   1. LoanDecisionPanel  - Under review / Approve / Reject / Disburse / Cancel
//   2. LoanReturnForm     - record a repayment (partial repayments welcome)
//   3. AgreementUploader  - upload the signed agreement (private file)
//
// WHAT EVERY PANEL DOES THE SAME WAY (this is the "smooth" part)
//   - the moment a button is pressed it shows a spinner and the label changes
//     ("Saving...", "Approving...", "Sending...")
//   - the button is DISABLED while the request is in flight, so a double click
//     cannot create two repayments or approve a loan twice
//   - when it finishes the page data is refreshed, so every number is new
//   - a successful action shows a green message, a failure a red one, and the
//     real error stays in the server log instead of being shown to the office
//
// NOTHING HERE DECIDES ANYTHING IMPORTANT
//   Every rule lives on the server (lib/loan/service.ts). These panels only
//   collect the values, so they cannot be tricked by changing the page.
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TextField, TextareaField, SelectField } from '@/components/forms/Field';
import { LOAN_RETURN_METHOD_OPTIONS } from '@/lib/loan/schemas';
import { formatMoney } from '@/lib/fund/calc';
import { cn } from '@/lib/utils';

// ========================================
// A SMALL SPINNER
// ========================================
function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      aria-hidden="true"
    />
  );
}

// ========================================
// TALK TO THE SERVER
// ========================================
async function postJson(url: string, body?: unknown, method = 'POST') {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload: {
    ok?: boolean;
    error?: string;
    message?: string;
    data?: unknown;
    fields?: Record<string, string>;
  } | null = null;

  try {
    payload = await response.json();
  } catch {
    /* some answers have no body */
  }

  return {
    ok: response.ok && payload?.ok !== false,
    message: payload?.message ?? '',
    error: payload?.error ?? 'Something went wrong. Please try again.',
    fields: payload?.fields ?? {},
    data: payload?.data,
  };
}

// ========================================
// 1. THE DECISION BUTTONS
// ========================================
const DECISIONS: {
  action: 'UNDER_REVIEW' | 'APPROVE' | 'REJECT' | 'DISBURSE' | 'CANCEL';
  label: string;
  busyLabel: string;
  variant: 'primary' | 'outline';
  /** What has to be true before this button makes sense. */
  allowedWhen: string[];
  /** Ask for a reason? */
  needsReason?: boolean;
  /** Ask for the date the money was handed over? */
  needsDate?: boolean;
  icon: IconName;
}[] = [
  {
    action: 'UNDER_REVIEW',
    label: 'Move to under review',
    busyLabel: 'Saving…',
    variant: 'outline',
    allowedWhen: ['PENDING'],
    icon: 'info',
  },
  {
    action: 'APPROVE',
    label: 'Approve this loan',
    busyLabel: 'Approving…',
    variant: 'primary',
    allowedWhen: ['PENDING', 'UNDER_REVIEW'],
    icon: 'check-circle',
  },
  {
    action: 'DISBURSE',
    label: 'Record that the money was handed over',
    busyLabel: 'Saving…',
    variant: 'primary',
    allowedWhen: ['APPROVED'],
    needsDate: true,
    icon: 'banknote',
  },
  {
    action: 'REJECT',
    label: 'Reject',
    busyLabel: 'Rejecting…',
    variant: 'outline',
    allowedWhen: ['PENDING', 'UNDER_REVIEW'],
    needsReason: true,
    icon: 'file-text',
  },
  {
    action: 'CANCEL',
    label: 'Cancel the loan',
    busyLabel: 'Cancelling…',
    variant: 'outline',
    allowedWhen: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'PARTIALLY_PAID', 'OVERDUE'],
    needsReason: true,
    icon: 'file-text',
  },
];

export function LoanDecisionPanel({ loanId, status }: { loanId: string; status: string }) {
  const router = useRouter();

  const [pending, setPending] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [disbursedDate, setDisbursedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const current = status.toUpperCase();

  async function run(action: string, needsReason?: boolean, needsDate?: boolean) {
    // Guard against a double click, and against a form that was left open.
    if (pending) return;

    if (needsReason && reason.trim().length < 3) {
      setNotice({ tone: 'error', text: 'Please write the reason first.' });
      return;
    }

    setPending(action);
    setNotice(null);

    const result = await postJson('/api/admin/loans/decisions', {
      loanId,
      action,
      reason: needsReason ? reason : undefined,
      disbursedDate: needsDate ? disbursedDate : undefined,
    });

    setPending(null);

    if (!result.ok) {
      setNotice({ tone: 'error', text: result.error });
      return;
    }

    setNotice({ tone: 'success', text: result.message || 'Saved.' });
    setOpenFor(null);
    setReason('');

    // Reload the page data so the status badge, the buttons and every total
    // are the new values straight away.
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h3 className="font-display text-lg font-bold text-ink-900">Next step</h3>
      <p className="mt-1 text-sm text-ink-600">
        The status of a loan is never typed in. It changes only through these buttons, so the
        figures always match the records.
      </p>

      {notice ? (
        <div className="mt-4">
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {DECISIONS.filter((decision) => decision.allowedWhen.includes(current)).map((decision) => {
          const busy = pending === decision.action;
          const open = openFor === decision.action;

          return (
            <div key={decision.action} className="rounded-card border border-ink-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-800">{decision.label}</span>

                <Button
                  type="button"
                  variant={decision.variant}
                  size="sm"
                  disabled={pending !== null}
                  onClick={() => {
                    if (decision.needsReason || decision.needsDate) {
                      setOpenFor(open ? null : decision.action);
                      return;
                    }
                    void run(decision.action);
                  }}
                >
                  {busy ? <Spinner /> : <Icon name={decision.icon} className="h-4 w-4" />}
                  {busy ? decision.busyLabel : open ? 'Continue' : 'Do it'}
                </Button>
              </div>

              {/* ---------- The small form the step needs ---------- */}
              {open ? (
                <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
                  {decision.needsDate ? (
                    <TextField
                      label="Date the money was handed over"
                      name="disbursedDate"
                      type="date"
                      value={disbursedDate}
                      onChange={(event) => setDisbursedDate(event.target.value)}
                    />
                  ) : null}

                  {decision.needsReason ? (
                    <TextareaField
                      label="Reason (the member is shown this)"
                      name="reason"
                      rows={3}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={pending !== null}
                      onClick={() => void run(decision.action, decision.needsReason, decision.needsDate)}
                    >
                      {busy ? <Spinner /> : null}
                      {busy ? decision.busyLabel : 'Confirm'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending !== null}
                      onClick={() => setOpenFor(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {DECISIONS.every((decision) => !decision.allowedWhen.includes(current)) ? (
          <Alert tone="info">
            This loan has finished its journey ({current.toLowerCase()}), so there are no further
            steps.
          </Alert>
        ) : null}
      </div>
    </div>
  );
}

// ========================================
// 2. RECORD A REPAYMENT
// ========================================
export function LoanReturnForm({ loanId, remaining }: { loanId: string; remaining: number }) {
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const fullAmount = remaining > 0 ? String(remaining) : '';

  async function submit() {
    // One request at a time: the button is disabled as well, but this guard
    // makes a double repayment impossible even if the key is held down.
    if (busy) return;

    setBusy(true);
    setNotice(null);

    const result = await postJson('/api/admin/loans/returns', {
      loanId,
      amount,
      returnDate,
      method,
      referenceNumber: reference,
      proofUrl,
      notes,
    });

    setBusy(false);

    if (!result.ok) {
      setNotice({ tone: 'error', text: result.error });
      return;
    }

    setNotice({ tone: 'success', text: result.message || 'Repayment recorded.' });
    setAmount('');
    setReference('');
    setProofUrl('');
    setNotes('');
    router.refresh();
  }

  if (remaining <= 0) {
    return (
      <div className="card p-5">
        <h3 className="font-display text-lg font-bold text-ink-900">Repayments</h3>
        <div className="mt-3">
          <Alert tone="success">This loan has been repaid in full. Nothing is outstanding.</Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-display text-lg font-bold text-ink-900">Record a repayment</h3>
      <p className="mt-1 text-sm text-ink-600">
        Part payments are fine. {formatMoney(remaining)} is still outstanding.
      </p>

      {notice ? (
        <div className="mt-4">
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      ) : null}

      <form
        ref={formRef}
        className="mt-4 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <TextField
              label="Amount received"
              name="amount"
              inputMode="numeric"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
            />
            <button
              type="button"
              className="mt-1.5 text-xs font-semibold text-brand-700 hover:underline"
              onClick={() => setAmount(fullAmount)}
            >
              Fill in the full outstanding amount ({formatMoney(remaining)})
            </button>
          </div>

          <TextField
            label="Date received"
            name="returnDate"
            type="date"
            required
            value={returnDate}
            onChange={(event) => setReturnDate(event.target.value)}
          />

          <SelectField
            label="How it was paid"
            name="method"
            options={LOAN_RETURN_METHOD_OPTIONS}
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          />

          <TextField
            label="Reference / receipt number"
            name="referenceNumber"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>

        <TextField
          label="Link to the proof (optional)"
          name="proofUrl"
          value={proofUrl}
          onChange={(event) => setProofUrl(event.target.value)}
          hint="Paste a link to a photo or scan of the receipt."
        />

        <TextareaField
          label="Remarks"
          name="notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? <Spinner /> : <Icon name="check-circle" className="h-4 w-4" />}
          {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Record this repayment'}
        </Button>
      </form>
    </div>
  );
}

// ========================================
// 3. UPLOAD THE SIGNED AGREEMENT
// ========================================
export function AgreementUploader({
  loanId,
  currentUrl,
}: {
  loanId: string;
  currentUrl: string | null;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [url, setUrl] = useState(currentUrl ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (busy) return;

    setBusy(true);
    setNotice(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch('/api/admin/loans/agreement', { method: 'POST', body: form });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string; data?: { url?: string } }
        | null;

      if (!response.ok || payload?.ok === false || !payload?.data?.url) {
        setNotice({
          tone: 'error',
          text: payload?.error ?? 'The file could not be uploaded.',
        });
        setBusy(false);
        return;
      }

      const uploadedUrl = payload.data.url;

      // Save the address on the loan straight away, so the agreement can never
      // be uploaded and then forgotten.
      const saved = await postJson(`/api/admin/loans/${loanId}`, { agreementUrl: uploadedUrl }, 'PATCH');

      setUrl(uploadedUrl);
      setBusy(false);

      setNotice(
        saved.ok
          ? { tone: 'success', text: 'Agreement uploaded and attached to this loan.' }
          : {
              tone: 'error',
              text: `The file was uploaded but could not be attached: ${saved.error}`,
            },
      );

      router.refresh();
    } catch {
      setBusy(false);
      setNotice({ tone: 'error', text: 'Could not reach the server. Please try again.' });
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-display text-lg font-bold text-ink-900">Physical agreement</h3>
      <p className="mt-1 text-sm text-ink-600">
        Scan or photograph the signed agreement and upload it here. It is stored outside the public
        website, and only a Super Administrator can open it.
      </p>

      {notice ? (
        <div className="mt-4">
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            // Clear the box so choosing the same file again still fires.
            event.target.value = '';
          }}
        />

        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Spinner /> : <Icon name="upload" className="h-4 w-4" />}
          {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : url ? 'Replace the agreement' : 'Upload the agreement'}
        </Button>

        {url ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <Icon name="eye" className="h-4 w-4" />
              View agreement
            </a>
            <a
              href={`${url}${url.includes('?') ? '&' : '?'}download=1`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:underline"
            >
              <Icon name="file-text" className="h-4 w-4" />
              Download
            </a>
          </>
        ) : (
          <span className="text-sm text-ink-500">No agreement has been uploaded yet.</span>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-500">
        PDF, JPG, PNG, WEBP or Word, up to 10 MB. On a hosting plan with a read-only disk this
        button explains the alternative instead of failing silently.
      </p>
    </div>
  );
}
