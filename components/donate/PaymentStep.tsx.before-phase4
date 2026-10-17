// ========================================
// DONATION - STEP 4 AND 5 (amount, method, pay, submit)
// ========================================
// THE ONE RULE THAT MATTERS HERE
//   The QR code and the bank account are hidden until BOTH of these are true:
//       - an amount greater than zero has been typed
//       - a payment method has been chosen
//   Until then the page shows only the two fields. That is why the money details
//   never appear on the landing page: a QR sitting next to a "Donate" button
//   invites payments that nobody can trace back to a donor.
//
// WHAT IS SHOWN IS REAL
//   Every detail comes from Admin Panel -> Settings -> Donation information. This
//   file draws no QR code of its own and invents no account number. If the office
//   has not filled them in, it says so plainly instead of showing a placeholder.
//
// SUBMITTING DOES NOT MEAN PAID
//   The button only tells the office "the donor says they have paid". The record
//   becomes PENDING, and an administrator confirms the money afterwards.
//
// THE RECEIPT IS SENT WITH THIS FORM
//   /api/upload requires a signed-in member, and a donor has no account, so the
//   picture travels in this multipart request. The server stores it privately and
//   writes the address itself - the browser never chooses where a receipt lives.
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PUBLIC_PAYMENT_METHODS } from '@/lib/donation/publicSchemas';
import { cn, formatMoney } from '@/lib/utils';

type Bank = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
};

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];

export function PaymentStep({
  reference,
  bank,
  hasBank,
  qrImageUrl,
}: {
  reference: string;
  bank: Bank;
  hasBank: boolean;
  qrImageUrl: string | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const numericAmount = Math.round(Number(amount.replace(/[, ]/g, '')) || 0);

  // ---------- THE GATE ----------
  // Nothing about where to send money is rendered until this is true.
  const detailsUnlocked = numericAmount > 0 && method !== '';

  const chosenMethod = PUBLIC_PAYMENT_METHODS.find((option) => option.value === method);
  const needsReceipt = chosenMethod?.needsReceipt ?? true;

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setErrors((current) => ({ ...current, receipt: '' }));

    if (receiptPreview) URL.revokeObjectURL(receiptPreview);

    if (!file) {
      setReceipt(null);
      setReceiptPreview(null);
      return;
    }

    setReceipt(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  async function submit() {
    const found: Record<string, string> = {};

    if (numericAmount <= 0) found.amount = 'Please enter the amount you paid.';
    if (!method) found.method = 'Please choose how you paid.';
    if (needsReceipt && !receipt) found.receipt = 'Please attach a photo or screenshot of your payment.';

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setErrors({});
    setFailure(null);
    setBusy(true);

    try {
      const form = new FormData();
      form.append('reference', reference);
      form.append('amount', String(numericAmount));
      form.append('method', method);
      form.append('transactionRef', transactionRef.trim());
      if (receipt) form.append('receipt', receipt);

      const response = await fetch('/api/donations/submit', { method: 'POST', body: form });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setFailure(payload?.error ?? 'We could not submit your donation. Please try again.');
        return;
      }

      router.push(`/donate/submitted/${reference}`);
    } catch {
      setFailure('We could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ========================================
          AMOUNT
          ======================================== */}
      <div className="card p-5">
        <label htmlFor="amount" className="block text-sm font-semibold text-ink-900">
          How much would you like to donate? <span className="text-red-600">*</span>
        </label>

        <div className="mt-3 flex items-center rounded-card border border-ink-300 bg-white px-4 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
          <span className="text-sm font-semibold text-ink-500">NPR</span>
          <input
            id="amount"
            name="amount"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setErrors((current) => ({ ...current, amount: '' }));
            }}
            className="w-full border-0 bg-transparent px-3 py-3 text-lg font-bold text-ink-900 focus:outline-none"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setAmount(String(value));
                setErrors((current) => ({ ...current, amount: '' }));
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                numericAmount === value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-600 hover:border-brand-300',
              )}
            >
              {formatMoney(value)}
            </button>
          ))}
        </div>

        {errors.amount ? (
          <p id="amount-error" className="mt-2 text-xs font-medium text-red-600">
            {errors.amount}
          </p>
        ) : null}
      </div>

      {/* ========================================
          METHOD
          ======================================== */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-ink-900">
          How would you like to pay? <span className="text-red-600">*</span>
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PUBLIC_PAYMENT_METHODS.map((option) => {
            const selected = method === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setMethod(option.value);
                  setErrors((current) => ({ ...current, method: '' }));
                }}
                aria-pressed={selected}
                className={cn(
                  'flex items-start gap-3 rounded-card border p-4 text-left transition',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  selected
                    ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500'
                    : 'border-ink-200 hover:border-brand-300',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-card',
                    selected ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-600',
                  )}
                >
                  <Icon name={option.value === 'ESEWA' ? 'phone' : 'banknote'} className="h-5 w-5" />
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink-900">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-600">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {errors.method ? (
          <p className="mt-2 text-xs font-medium text-red-600">{errors.method}</p>
        ) : null}
      </div>

      {/* ========================================
          THE PAYMENT DETAILS - LOCKED UNTIL AN AMOUNT AND A METHOD EXIST
          ======================================== */}
      {detailsUnlocked ? (
        <div className="card border-brand-200 bg-brand-50/50 p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Icon name="qr-code" className="h-5 w-5 text-brand-600" />
            Pay {formatMoney(numericAmount)}
          </h3>

          <p className="mt-1 text-sm text-ink-700">
            Pay exactly {formatMoney(numericAmount)} using the details below, then send us the receipt
            so the office can confirm it.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* ---------- QR ---------- */}
            {qrImageUrl ? (
              <div className="text-center">
                <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-card bg-white ring-1 ring-ink-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl}
                    alt="The club's payment QR code"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
                <p className="mt-2 text-xs text-ink-500">Scan with your banking or wallet app.</p>
              </div>
            ) : null}

            {/* ---------- Bank account ---------- */}
            <div>
              {hasBank ? (
                <dl className="space-y-2.5 text-sm">
                  {bank.accountName ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        Account holder
                      </dt>
                      <dd className="text-ink-800">{bank.accountName}</dd>
                    </div>
                  ) : null}

                  {bank.accountNumber ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        Account number
                      </dt>
                      <dd className="font-mono text-ink-800">{bank.accountNumber}</dd>
                    </div>
                  ) : null}

                  {bank.bankName ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        Bank
                      </dt>
                      <dd className="text-ink-800">{bank.bankName}</dd>
                    </div>
                  ) : null}

                  {bank.branch ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        Branch
                      </dt>
                      <dd className="text-ink-800">{bank.branch}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <Alert tone="warning">
                  The club has not published its bank details or QR code yet. Please contact the
                  office before paying.
                </Alert>
              )}
            </div>
          </div>

          <p className="mt-4 rounded-card bg-white/70 p-3 text-xs leading-relaxed text-ink-600">
            Please keep the transaction ID from your banking or eSewa app. You will need it below, and
            it is the quickest way for the office to find your payment.
          </p>
        </div>
      ) : (
        <p className="text-xs text-ink-500">
          Enter an amount and choose how you will pay - the payment details will appear here.
        </p>
      )}

      {/* ========================================
          RECEIPT + REFERENCE
          ======================================== */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-ink-900">
          After you have paid {detailsUnlocked ? formatMoney(numericAmount) : ''}
        </p>
        <p className="mt-1 text-xs text-ink-600">
          Attach a photo or screenshot of the payment so the office can check it.
        </p>

        <div className="mt-4">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={chooseFile}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="upload" className="h-4 w-4" />
              {receipt ? 'Choose a different file' : 'Attach the receipt'}
            </Button>

            {receipt ? (
              <span className="text-xs text-ink-600">
                {receipt.name} · {Math.round(receipt.size / 1024)} KB
              </span>
            ) : null}
          </div>

          {receiptPreview ? (
            <div className="mt-3 w-40 overflow-hidden rounded-card ring-1 ring-ink-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptPreview} alt="The receipt you attached" className="w-full" />
            </div>
          ) : null}

          {errors.receipt ? (
            <p className="mt-2 text-xs font-medium text-red-600">{errors.receipt}</p>
          ) : null}
        </div>

        <div className="mt-5">
          <label htmlFor="transactionRef" className="block text-sm font-semibold text-ink-900">
            Transaction ID
          </label>
          <input
            id="transactionRef"
            name="transactionRef"
            type="text"
            maxLength={80}
            placeholder="For example 0AB1234CD5"
            value={transactionRef}
            onChange={(event) => setTransactionRef(event.target.value)}
            className="mt-2 w-full rounded-card border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1 text-xs text-ink-500">
            Optional, but it helps the office find your payment faster.
          </p>
        </div>
      </div>

      {failure ? <Alert tone="error">{failure}</Alert> : null}

      {/* ========================================
          SUBMIT
          ======================================== */}
      <div>
        <Button type="button" variant="primary" size="lg" onClick={submit} disabled={busy}>
          {busy ? 'Submitting…' : 'I Have Paid - Submit for Verification'}
          {busy ? null : <Icon name="check-circle" className="h-4 w-4" />}
        </Button>

        <p className="mt-2 text-xs text-ink-500">
          Your donation is marked successful only after the office has checked this payment.
        </p>
      </div>
    </div>
  );
}
