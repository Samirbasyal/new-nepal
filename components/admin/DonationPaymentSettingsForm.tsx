// ========================================
// ADMIN PANEL - WHERE A DONOR SENDS THE MONEY
// ========================================
// This is the one screen that decides what a donor is shown on the payment page:
// the bank account, the QR picture, the eSewa ID and the short instruction line.
//
// WHY IT IS SEPARATE FROM THE RECORD LIST
//   Recording a donation and telling the world where to send money are two
//   different jobs. Mixing them means somebody editing a donor's address can
//   accidentally change the club's bank account.
//
// WHAT HAPPENS WHEN A FIELD IS EMPTY
//   - no bank details and no QR  -> the "Bank transfer" method is not offered
//   - no eSewa ID                -> the "eSewa" method is not offered
//   This is deliberate. The website never shows a method that cannot be paid, and
//   it never draws a QR code of its own.
//
// THE QR PICTURE IS UPLOADED, NOT DRAWN
//   The image is stored by /api/upload (the same permanent storage the gallery
//   uses) and only its address is saved. Nothing here can invent a QR code.
//
// HOW IT IS SAVED
//   One request to POST /api/admin/settings. The server accepts only the keys it
//   knows about (lib/settings.ts), so nothing else in the settings table can be
//   touched from this form.
// ========================================

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField, TextareaField } from '@/components/forms/Field';
import { checkImageFile } from '@/lib/upload-limits';

/** The keys this form owns. Anything else is left exactly as it was. */
const OWNED_KEYS = [
  'donate.bankName',
  'donate.bankAccountName',
  'donate.bankAccountNumber',
  'donate.bankBranch',
  'donate.qrImageUrl',
  'donate.esewaId',
  'donate.esewaName',
  'donate.paymentNote',
] as const;

export function DonationPaymentSettingsForm({ initial }: { initial: Record<string, string> }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const key of OWNED_KEYS) start[key] = initial[key] ?? '';
    return start;
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSuccess(null);
    setError(null);
  }

  // ========================================
  // UPLOAD THE QR PICTURE
  // ========================================
  async function uploadQr(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    // ---------- 4 MB rule, checked before the upload starts ----------
    const check = checkImageFile(file);
    if (!check.ok) {
      setError(check.error);
      setSuccess(null);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      form.append('file', file);
      // 'photo' = a normal public website picture, which is what a QR code is.
      form.append('purpose', 'photo');

      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'The picture could not be uploaded. Please try again.');
        return;
      }

      const url = String(payload.data?.url ?? '');
      if (!url) {
        setError('The picture was uploaded but no address came back. Please try again.');
        return;
      }

      update('donate.qrImageUrl', url);
      setSuccess('QR picture uploaded. Press "Save payment details" to publish it.');
    } catch {
      setError('The website could not be reached. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }

  // ========================================
  // SAVE
  // ========================================
  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payloadValues: Record<string, string> = {};
    for (const key of OWNED_KEYS) payloadValues[key] = (values[key] ?? '').trim();

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: payloadValues }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'The payment details could not be saved. Please try again.');
        return;
      }

      setSuccess(
        'Payment details saved. The donation page now shows exactly these details, and only the methods that are filled in.',
      );
      router.refresh();
    } catch {
      setError('The website could not be reached. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const qr = (values['donate.qrImageUrl'] ?? '').trim();
  const hasBank =
    ['donate.bankName', 'donate.bankAccountName', 'donate.bankAccountNumber', 'donate.bankBranch'].some(
      (key) => (values[key] ?? '').trim() !== '',
    ) || qr !== '';
  const hasEsewa = (values['donate.esewaId'] ?? '').trim() !== '';

  return (
    <div className="space-y-6">
      {success ? <Alert tone="success">{success}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* ========================================
          WHAT THE DONOR WILL SEE
          ======================================== */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-ink-900">What the donor will be able to choose</h2>
        <p className="mt-1 text-xs text-ink-500">
          This is decided purely by which fields below are filled in. Nothing is shown to a donor before
          they have entered an amount and picked a method.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              hasBank ? 'bg-green-50 text-green-800' : 'bg-ink-100 text-ink-500'
            }`}
          >
            <Icon name={hasBank ? 'check-circle' : 'close'} className="h-3.5 w-3.5" />
            Bank transfer {hasBank ? 'available' : 'hidden'}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              hasEsewa ? 'bg-green-50 text-green-800' : 'bg-ink-100 text-ink-500'
            }`}
          >
            <Icon name={hasEsewa ? 'check-circle' : 'close'} className="h-3.5 w-3.5" />
            eSewa {hasEsewa ? 'available' : 'hidden'}
          </span>
        </div>
      </div>

      {/* ========================================
          THE QR PICTURE
          ======================================== */}
      <section className="card p-6">
        <h2 className="text-base font-bold text-ink-900">QR code</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Upload the QR picture from the club&apos;s banking app. It is shown to a donor only after they
          have entered an amount and chosen bank transfer. If the picture is left empty, only the account
          number is shown.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={uploadQr}
        />

        <div className="mt-4 flex flex-wrap items-start gap-5">
          {qr ? (
            <div className="h-40 w-40 overflow-hidden rounded-card bg-white ring-1 ring-ink-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="The payment QR code" className="h-full w-full object-contain p-2" />
            </div>
          ) : (
            <div className="grid h-40 w-40 place-items-center rounded-card border border-dashed border-ink-300 text-center text-xs text-ink-400">
              No QR
              <br />
              picture yet
            </div>
          )}

          <div className="min-w-[220px] flex-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={uploading || saving}
              >
                {uploading ? (
                  <>
                    <Icon name="refresh" className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Icon name="upload" className="h-4 w-4" />
                    {qr ? 'Replace the picture' : 'Upload a picture'}
                  </>
                )}
              </Button>

              {qr ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => update('donate.qrImageUrl', '')}
                  disabled={uploading || saving}
                >
                  <Icon name="trash" className="h-4 w-4" />
                  Remove
                </Button>
              ) : null}
            </div>

            <TextField
              name="qrImageUrl"
              label="Or paste the picture address"
              placeholder="https://..."
              value={qr}
              onChange={(event) => update('donate.qrImageUrl', event.target.value)}
              hint="An address that already points at the club's QR picture. Leave it empty to hide the QR."
            />
          </div>
        </div>
      </section>

      {/* ========================================
          THE BANK ACCOUNT
          ======================================== */}
      <section className="card p-6">
        <h2 className="text-base font-bold text-ink-900">Bank account</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Public information only. Never put internet-banking passwords, PINs or card numbers on this
          website.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            name="bankName"
            label="Bank name"
            placeholder="For example: Nepal Investment Mega Bank"
            value={values['donate.bankName'] ?? ''}
            onChange={(event) => update('donate.bankName', event.target.value)}
          />
          <TextField
            name="bankAccountName"
            label="Account holder name"
            placeholder="Janakalyan Samata Yuwa Club"
            value={values['donate.bankAccountName'] ?? ''}
            onChange={(event) => update('donate.bankAccountName', event.target.value)}
          />
          <TextField
            name="bankAccountNumber"
            label="Account number"
            placeholder="01234567890123"
            value={values['donate.bankAccountNumber'] ?? ''}
            onChange={(event) => update('donate.bankAccountNumber', event.target.value)}
          />
          <TextField
            name="bankBranch"
            label="Branch"
            placeholder="For example: Kathmandu"
            value={values['donate.bankBranch'] ?? ''}
            onChange={(event) => update('donate.bankBranch', event.target.value)}
          />
        </div>
      </section>

      {/* ========================================
          ESEWA
          ======================================== */}
      <section className="card p-6">
        <h2 className="text-base font-bold text-ink-900">eSewa</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Leave the eSewa ID empty if the club does not receive donations by eSewa - the method is then
          hidden on the donation page. This is a manual transfer: the donor pays in the eSewa app and
          attaches the screenshot. The office still checks every payment by hand.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            name="esewaId"
            label="eSewa ID or mobile number"
            placeholder="98XXXXXXXX"
            value={values['donate.esewaId'] ?? ''}
            onChange={(event) => update('donate.esewaId', event.target.value)}
            hint="Shown to the donor on the payment page."
          />
          <TextField
            name="esewaName"
            label="eSewa account holder name"
            placeholder="Janakalyan Samata Yuwa Club"
            value={values['donate.esewaName'] ?? ''}
            onChange={(event) => update('donate.esewaName', event.target.value)}
          />
        </div>
      </section>

      {/* ========================================
          THE INSTRUCTION LINE
          ======================================== */}
      <section className="card p-6">
        <h2 className="text-base font-bold text-ink-900">Instruction line</h2>
        <p className="mt-1 text-xs text-ink-500">
          One or two sentences shown above the bank details on the payment page. Leave it empty and a
          sensible default is used.
        </p>

        <div className="mt-4">
          <TextareaField
            name="paymentNote"
            label="Instructions for the donor"
            rows={3}
            placeholder="For example: Please transfer the exact amount, then attach the screenshot below. Your donation is confirmed after the office checks it."
            value={values['donate.paymentNote'] ?? ''}
            onChange={(event) => update('donate.paymentNote', event.target.value)}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" onClick={save} disabled={saving || uploading}>
          {saving ? (
            <>
              <Icon name="refresh" className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Icon name="save" className="h-4 w-4" />
              Save payment details
            </>
          )}
        </Button>

        <p className="text-xs text-ink-500">
          These details are public: they are shown to every donor on the payment page.
        </p>
      </div>
    </div>
  );
}
