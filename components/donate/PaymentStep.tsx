// ========================================
// DONATION - THE PAYMENT PAGE (amount, method, details, confirm, submit)
// ========================================
// THE THREE STEPS ON THIS ONE PAGE
//   1. Amount        how much the donor wants to give
//   2. How you pay   bank transfer / bank QR, or eSewa
//   3. Confirm       the amount and the method are repeated, the real payment
//                    details appear, the receipt is attached and it is submitted
//
// WHY THE DETAILS WAIT UNTIL STEP 3
//   A QR code sitting next to a "Donate" button invites payments that nobody can
//   trace back to a donor. So the account number and the QR are only drawn after
//   the donor has typed an amount AND chosen a method - never before.
//
// WHAT IS SHOWN IS REAL
//   Every detail comes from  Admin Panel -> Donations -> Bank & QR details
//   (keys donate.*). This file draws no QR of its own and invents no account
//   number. When the office has not filled something in, the method is simply not
//   offered, and the screen says so in plain words instead of showing a
//   placeholder.
//
// A METHOD IS ONLY OFFERED WHEN IT CAN BE PAID
//   Bank transfer appears when a bank account or a QR picture exists.
//   eSewa appears only when an eSewa ID has been saved. An empty field means the
//   method is hidden, so the club is never asked for money it cannot receive.
//
// SUBMITTING DOES NOT MEAN PAID
//   The button only tells the office "the donor says they have paid". The record
//   becomes PENDING and an administrator confirms the money afterwards.
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
import { checkImageFile } from '@/lib/upload-limits';
import { cn, formatMoney } from '@/lib/utils';

type Bank = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
};

type Esewa = {
  id: string;
  name: string;
};

// The four amounts the club suggests. A small gift matters as much as a large
// one - NPR 100 is real money for a student - so the row starts there.
const QUICK_AMOUNTS = [100, 500, 1000, 5000];

/** The three stops of this page, as shown in the little progress bar. */
const STAGES = [
  { key: 'amount', label: 'Amount' },
  { key: 'method', label: 'How you pay' },
  { key: 'confirm', label: 'Confirm' },
] as const;

type Stage = (typeof STAGES)[number]['key'];

export function PaymentStep({
  reference,
  bank,
  hasBank,
  qrImageUrl,
  esewa,
  hasEsewa,
  paymentNote,
}: {
  reference: string;
  bank: Bank;
  hasBank: boolean;
  qrImageUrl: string | null;
  esewa: Esewa;
  hasEsewa: boolean;
  paymentNote: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('amount');

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const numericAmount = Math.round(Number(amount.replace(/[, ]/g, '')) || 0);

  // ---------- which methods can actually be paid ----------
  const methods = PUBLIC_PAYMENT_METHODS.filter((option) =>
    option.value === 'BANK_TRANSFER' ? hasBank : option.value === 'ESEWA' ? hasEsewa : false,
  );

  const chosenMethod = PUBLIC_PAYMENT_METHODS.find((option) => option.value === method);
  const needsReceipt = chosenMethod?.needsReceipt ?? true;

  const stageIndex = STAGES.findIndex((item) => item.key === stage);

  function goTo(next: Stage) {
    setFailure(null);
    setStage(next);

    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ========================================
  // STAGE 1 -> STAGE 2
  // ========================================
  function continueFromAmount() {
    if (numericAmount <= 0) {
      setErrors({ amount: 'Please enter the amount you would like to donate.' });
      return;
    }

    if (numericAmount > 100_000_000) {
      setErrors({ amount: 'That amount looks too large. Please check the number.' });
      return;
    }

    setErrors({});
    goTo('method');
  }

  // ========================================
  // STAGE 2 -> STAGE 3
  // ========================================
  function continueFromMethod() {
    if (!method) {
      setErrors({ method: 'Please choose how you would like to pay.' });
      return;
    }

    setErrors({});
    goTo('confirm');
  }

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setErrors((current) => ({ ...current, receipt: '' }));

    if (receiptPreview) URL.revokeObjectURL(receiptPreview);

    if (!file) {
      setReceipt(null);
      setReceiptPreview(null);
      return;
    }

    // ---------- 4 MB rule, checked before a single byte is sent ----------
    const check = checkImageFile(file);
    if (!check.ok) {
      setErrors((current) => ({ ...current, receipt: check.error }));
      event.target.value = '';
      setReceipt(null);
      setReceiptPreview(null);
      return;
    }

    setReceipt(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  // ========================================
  // SUBMIT
  // ========================================
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
          WHERE AM I - the three small steps
          ======================================== */}
      <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {STAGES.map((item, index) => {
          const done = index < stageIndex;
          const active = index === stageIndex;

          return (
            <li key={item.key} className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px]',
                  done && 'border-brand-600 bg-brand-600 text-white',
                  active && 'border-brand-600 bg-brand-50 text-brand-700',
                  !done && !active && 'border-ink-300 text-ink-400',
                )}
              >
                {done ? <Icon name="check" className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className={cn(active ? 'text-ink-900' : 'text-ink-500')}>{item.label}</span>
              {index < STAGES.length - 1 ? <span className="text-ink-300">→</span> : null}
            </li>
          );
        })}
      </ol>

      {/* ========================================
          NO WAY TO PAY YET
          ======================================== */}
      {methods.length === 0 ? (
        <Alert tone="warning">
          The club has not published its bank details, QR code or eSewa ID yet, so no donation can be
          paid on the website at the moment. Please contact the office before sending any money.
        </Alert>
      ) : null}

      {/* ========================================
          STAGE 1 - THE AMOUNT
          ======================================== */}
      {stage === 'amount' ? (
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

          <p className="mt-4 text-xs text-ink-500">
            Next you will choose how to pay. The bank details and the QR code appear only after that,
            so every payment can be traced back to you.
          </p>

          <div className="mt-5">
            <Button type="button" variant="primary" onClick={continueFromAmount} disabled={methods.length === 0}>
              Continue
              <Icon name="arrow-right" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* ========================================
          STAGE 2 - HOW YOU PAY
          ======================================== */}
      {stage === 'method' ? (
        <div className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink-900">
              How would you like to pay? <span className="text-red-600">*</span>
            </p>
            <p className="text-sm text-ink-600">
              Amount: <span className="font-bold text-ink-900">{formatMoney(numericAmount)}</span>
            </p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {methods.map((option) => {
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

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => goTo('amount')}>
              <Icon name="chevron-left" className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" variant="primary" onClick={continueFromMethod}>
              Continue
              <Icon name="arrow-right" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* ========================================
          STAGE 3 - CONFIRM, PAY, ATTACH THE RECEIPT
          ======================================== */}
      {stage === 'confirm' ? (
        <>
          {/* ---------- the confirmation of what was chosen ---------- */}
          <div className="card border-brand-200 bg-brand-50/50 p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
              <Icon name="check-circle" className="h-5 w-5 text-brand-600" />
              Please confirm your donation
            </h3>

            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Amount</dt>
                <dd className="font-display text-lg font-bold text-ink-900">{formatMoney(numericAmount)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Paying by
                </dt>
                <dd className="text-ink-800">{chosenMethod?.label ?? '-'}</dd>
              </div>
            </dl>

            <p className="mt-3 rounded-card bg-white/70 p-3 text-xs leading-relaxed text-ink-600">
              Pay exactly <span className="font-bold text-ink-900">{formatMoney(numericAmount)}</span> - a
              different amount takes longer for the office to match. Keep the transaction ID from your
              banking or eSewa app; you will need it below.
            </p>

            <button
              type="button"
              onClick={() => goTo(method === 'ESEWA' ? 'method' : 'amount')}
              className="mt-3 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              Change the amount or the method
            </button>
          </div>

          {/* ---------- the real payment details ---------- */}
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
              <Icon name={method === 'ESEWA' ? 'phone' : 'qr-code'} className="h-5 w-5 text-brand-600" />
              {method === 'ESEWA' ? `Send ${formatMoney(numericAmount)} by eSewa` : `Pay ${formatMoney(numericAmount)}`}
            </h3>

            {paymentNote ? (
              <p className="mt-1 text-sm text-ink-700">{paymentNote}</p>
            ) : (
              <p className="mt-1 text-sm text-ink-700">
                Use the details below, then attach the receipt so the office can confirm it.
              </p>
            )}

            {method === 'ESEWA' ? (
              <dl className="mt-4 space-y-2.5 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">eSewa ID</dt>
                  <dd className="font-mono text-ink-800">{esewa.id}</dd>
                </div>
                {esewa.name ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      Account holder
                    </dt>
                    <dd className="text-ink-800">{esewa.name}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Bank</dt>
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
                      Only a QR code is published for bank payments. Please scan the code above, or
                      contact the office for the account number.
                    </Alert>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---------- receipt + reference ---------- */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-ink-900">
              After you have paid {formatMoney(numericAmount)}
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
                <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
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
                Optional, but it is the quickest way for the office to find your payment.
              </p>
            </div>
          </div>

          {failure ? <Alert tone="error">{failure}</Alert> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => goTo('method')} disabled={busy}>
              <Icon name="chevron-left" className="h-4 w-4" />
              Back
            </Button>

            <Button type="button" variant="primary" size="lg" onClick={submit} disabled={busy}>
              {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'I Have Paid - Submit for Verification'}
              {busy ? <Icon name="refresh" className="h-4 w-4 animate-spin" /> : <Icon name="check-circle" className="h-4 w-4" />}
            </Button>
          </div>

          <p className="text-xs text-ink-500">
            Your donation is marked successful only after the office has checked this payment.
          </p>
        </>
      ) : null}
    </div>
  );
}
