// ========================================
// MEMBER PANEL - PAY MONTHLY FUND FORM
// ========================================
// The form a member fills in AFTER transferring the money to one of the
// organization's bank accounts.
//
// HOW IT WORKS
//   1. The member picks a bank. The account details and the QR code for that
//      bank appear immediately underneath, so there is no confusion about
//      where to send the money.
//   2. They type the amount, the date, the bank's transaction id and attach
//      the receipt picture.
//   3. The form posts everything to /api/member/fund/pay.
//   4. The payment is saved as "Pending verification" - a member can never
//      approve their own money.
//
// VALIDATION HAPPENS TWICE
//   Once here (friendly messages) and again on the server
//   (lib/fund/schemas.ts), which is the one that actually protects the data.
// ========================================

'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { NepaliDateField } from '@/components/ui/NepaliDateField';
import { Alert } from '@/components/ui/Alert';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TextField, TextareaField, SelectField } from '@/components/forms/Field';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { paymentAccountTypeLabel } from '@/lib/constants';
import { checkImageFile } from '@/lib/upload-limits';
import { cn } from '@/lib/utils';

export type BankOption = {
  id: string;
  name: string;
  accountName: string;
  accountNumber: string;
  branch: string | null;
  qrImageUrl: string | null;
  instructions: string | null;
  /** BANK / ESEWA / KHALTI / OTHER - see PAYMENT_ACCOUNT_TYPE_OPTIONS. */
  methodType?: string | null;
  /** The label printed above the number, e.g. "eSewa ID" or "Account number". */
  accountLabel?: string | null;
  /** The account the office asks members to use first. */
  isDefault?: boolean | null;
};

export type MonthOption = { value: string; label: string };

/** Build the list of selectable months (the current one and a few before). */
export function buildMonthOptions(monthsBack = 4): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();

  for (let index = 0; index < monthsBack; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    options.push({
      value,
      label: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    });
  }

  return options;
}

export function PayFundForm({
  banks,
  monthlyAmount,
  receiptRequired,
  currency = 'NPR',
  defaultMonth,
}: {
  banks: BankOption[];
  monthlyAmount: number;
  receiptRequired: boolean;
  currency?: string;
  defaultMonth: string;
}) {
  const currentMonth = buildMonthOptions(4);
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id ?? '');
  const [amount, setAmount] = useState(String(monthlyAmount));
  const [receiptUrl, setReceiptUrl] = useState('');
  // Today, in the office's own calendar as much as in the browser's.
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { busy, success, error, fieldErrors, submit } = useFormSubmit('/api/member/fund/pay');

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.id === selectedBankId) ?? null,
    [banks, selectedBankId],
  );

  // Upload the receipt picture and store the returned address in a hidden field.
  async function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // ---------- 4 MB rule, checked before the upload starts ----------
    const check = checkImageFile(file);
    if (!check.ok) {
      setUploadError(check.error);
      event.target.value = '';
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // A payment receipt is stored PRIVATELY: only the member who sent it
      // and an administrator may open it.
      formData.append('purpose', 'receipt');

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.ok) {
        setUploadError(json?.error ?? 'The receipt could not be uploaded.');
        return;
      }

      setReceiptUrl(json.data.url as string);
    } catch {
      setUploadError('The receipt could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries()) as Record<string, string>;

    const ok = await submit({
      amount: values.amount,
      bankId: values.bankId,
      paymentDate: values.paymentDate,
      transactionId: values.transactionId,
      referenceNumber: values.referenceNumber,
      receiptUrl,
      periodMonth: values.periodMonth,
      note: values.note,
    });

    // On success we stay on the page and show the confirmation, because the
    // member usually wants to note down what happens next.
    if (ok) {
      setReceiptUrl('');
    }
  }

  if (banks.length === 0) {
    return (
      <Alert tone="warning" title="No bank account is available yet">
        The office has not added a bank account for receiving contributions. Please check back
        later or contact the office.
      </Alert>
    );
  }

  // ========================================
  // SUCCESS SCREEN
  // ========================================
  // Once the payment is saved, the form is gone and nothing else is shown on this
  // screen. A member who has just sent money should read one clear message, not
  // scroll past a form that looks as if it is still waiting to be filled in.
  //
  // The payment is NOT approved here. It is PENDING until an administrator checks
  // the receipt in Admin Panel -> Payment verification. The 24 hours is the review
  // period the office promises, not an automatic approval.
  if (success) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-8 text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-green-200">
            <Icon name="check-circle" className="h-8 w-8" />
          </span>

          <h2 className="mt-5 font-display text-2xl font-bold text-ink-900">
            Successfully submitted your request!
          </h2>

          <p className="mt-2 font-display text-lg font-bold text-accent-600">
            Please wait for approval within 24 hours.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            Your payment details and receipt are saved. It is <strong>waiting for the office to
            verify it</strong> and is <strong>not approved yet</strong>. Nothing is counted as
            received until an administrator has checked it.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
            <Icon name="clock" className="h-4 w-4" />
            Pending Payment
          </div>

          <p className="mt-4 text-xs text-ink-500">
            You will receive a notification here as soon as the office approves or rejects it.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/member/fund/history"
              className="inline-flex items-center gap-2 rounded-btn bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Icon name="list" className="h-4 w-4" />
              See my payment history
            </Link>

            <Link
              href="/member/dashboard"
              className="inline-flex items-center gap-2 rounded-btn border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
            >
              <Icon name="grid" className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Alert tone="error" title="Could not submit the payment">{error}</Alert> : null}

      {/* ========================================
          STEP 1 - CHOOSE THE BANK
          ======================================== */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-ink-900">
          1. Where did you transfer the money?
        </legend>

        <SelectField
          name="bankId"
          label="Bank account"
          required
          value={selectedBankId}
          onChange={(event) => setSelectedBankId(event.target.value)}
          error={fieldErrors.bankId}
          options={banks.map((bank) => ({
            value: bank.id,
            // The account the office recommends is clearly marked, so a member
            // who is unsure simply picks it.
            label: `${bank.name}${bank.isDefault ? ' (recommended)' : ''} — ${bank.accountNumber}`,
          }))}
        />

        {selectedBank ? (
          <div className="grid gap-4 rounded-card border border-brand-100 bg-brand-50/50 p-4 sm:grid-cols-[1fr_auto]">
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 font-medium text-ink-600">Pay with</dt>
                <dd className="text-ink-900">
                  {paymentAccountTypeLabel(selectedBank.methodType)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 font-medium text-ink-600">Name on account</dt>
                <dd className="text-ink-900">{selectedBank.accountName}</dd>
              </div>
              <div className="flex gap-2">
                {/* The label is set by the office: "Account number" for a bank,
                    "eSewa ID" or "Khalti ID" for a wallet. */}
                <dt className="w-32 shrink-0 font-medium text-ink-600">
                  {selectedBank.accountLabel?.trim() || 'Account number'}
                </dt>
                <dd className="font-mono text-ink-900">{selectedBank.accountNumber}</dd>
              </div>
              {selectedBank.branch ? (
                <div className="flex gap-2">
                  <dt className="w-32 shrink-0 font-medium text-ink-600">Branch</dt>
                  <dd className="text-ink-900">{selectedBank.branch}</dd>
                </div>
              ) : null}
              {selectedBank.instructions ? (
                <p className="pt-2 text-ink-700">{selectedBank.instructions}</p>
              ) : null}
            </dl>

            {selectedBank.qrImageUrl ? (
              <figure className="justify-self-center text-center">
                <div className="relative h-40 w-40 overflow-hidden rounded-card border border-ink-200 bg-white p-2">
                  <Image
                    src={selectedBank.qrImageUrl}
                    alt={`Payment QR code for ${selectedBank.name}`}
                    fill
                    sizes="160px"
                    className="object-contain"
                  />
                </div>
                <figcaption className="mt-1 text-xs text-ink-500">
                  Scan to pay with a mobile wallet
                </figcaption>
              </figure>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      {/* ========================================
          STEP 2 - PAYMENT DETAILS
          ======================================== */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-ink-900">
          2. Payment details
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="amount"
            label={`Amount (${currency})`}
            type="number"
            min={1}
            step={1}
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={fieldErrors.amount}
            hint={`The monthly amount is ${monthlyAmount.toLocaleString('en-IN')}.`}
          />

          {/* The form reads its values with new FormData(...), so the picker
              writes the same field through a hidden input. handleSubmit and the
              API receive exactly the YYYY-MM-DD they did before. */}
          <NepaliDateField
            name="paymentDate"
            label="Date you paid"
            required
            submitName="paymentDate"
            value={paymentDate}
            onChange={setPaymentDate}
            error={fieldErrors.paymentDate}
          />

          <SelectField
            name="periodMonth"
            label="Which month is this for?"
            options={currentMonth}
            defaultValue={defaultMonth}
            error={fieldErrors.periodMonth}
          />

          <TextField
            name="transactionId"
            label="Transaction ID"
            required
            placeholder="From your bank receipt"
            error={fieldErrors.transactionId}
            hint="Each transaction ID can only be submitted once."
          />

          <TextField
            name="referenceNumber"
            label="Reference number (optional)"
            error={fieldErrors.referenceNumber}
          />
        </div>

        {/* ---------- Receipt ---------- */}
        <div>
          <label className="label" htmlFor="receipt">
            Receipt / screenshot {receiptRequired ? '' : '(optional)'}
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <input
              id="receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleReceiptChange}
              className="block w-full max-w-sm text-sm text-ink-700 file:mr-3 file:rounded-btn file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
            />

            {uploading ? <span className="text-sm text-ink-500">Uploading…</span> : null}

            {receiptUrl ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                <Icon name="check-circle" className="h-4 w-4" />
                Receipt attached
              </span>
            ) : null}
          </div>

          {receiptRequired && !receiptUrl ? (
            <p className={cn('mt-1 text-xs', fieldErrors.receiptUrl ? 'text-red-600' : 'text-ink-500')}>
              {fieldErrors.receiptUrl ??
                'A receipt is required. If you do not have one, please contact the office.'}
            </p>
          ) : null}

          {uploadError ? <p className="mt-1 text-xs text-red-600">{uploadError}</p> : null}
        </div>

        <TextareaField
          name="note"
          label="Note (optional)"
          rows={3}
          placeholder="Anything the office should know about this payment"
          error={fieldErrors.note}
        />
      </fieldset>

      <Button type="submit" disabled={busy || uploading} className="w-full sm:w-auto">
        {busy ? (
          // The indicator sits on the button that was clicked, in the orange
          // accent colour, and stays until the server has answered.
          <span className="inline-flex items-center gap-2 text-accent-100" role="status">
            <Icon name="refresh" className="h-4 w-4 animate-spin" />
            Please wait…
          </span>
        ) : (
          'Submit payment for verification'
        )}
      </Button>
    </form>
  );
}
