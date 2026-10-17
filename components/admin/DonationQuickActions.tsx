// ========================================
// ADMIN PANEL - EDIT OR REMOVE ONE DONATION
// ========================================
// Two small buttons that sit on a donation card:
//
//   Edit    correct a name, a phone number, the amount, the purpose, the receipt
//           number or the date. This works on a donation in ANY state, including
//           one that has already been approved - the office often spots a typo
//           days later, and forcing them to delete and re-enter the gift would
//           lose the audit trail.
//
//   Delete  hide the record. It is never really destroyed: the row is marked
//           isDeleted and disappears from every total, which is what makes the
//           figures on the screen stay explainable.
//
// WHAT IT CANNOT DO
//   It cannot approve or reject. The status of a donation is only changed by the
//   Verify / Reject buttons, which go through their own route and record who
//   decided and when. An edit form that could type "verified" would let a wrong
//   click call money received.
//
// WHERE IT SENDS THE CHANGE
//   PATCH  /api/admin/donations/<id>   (validated again on the server)
//   DELETE /api/admin/donations/<id>   (soft delete, written to the audit log)
//   Both routes refuse anybody who is not an administrator.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField, TextareaField, SelectField } from '@/components/forms/Field';
import { DONATION_METHOD_OPTIONS } from '@/lib/donation/schemas';
import { DonationPermanentDelete } from '@/components/admin/DonationPermanentDelete';

export type EditableDonation = {
  id: string;
  donorName: string;
  donorEmail: string | null;
  donorPhone: string | null;
  amount: number;
  method: string;
  purpose: string | null;
  reference: string | null;
  remarks: string | null;
  /** ISO date, so it can travel from a server component to the browser. */
  receivedOn: string;
  /** True when a receipt picture is attached - the delete dialog says so. */
  hasReceipt?: boolean;
};

export function DonationQuickActions({ donation }: { donation: EditableDonation }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const [form, setForm] = useState({
    donorName: donation.donorName,
    donorEmail: donation.donorEmail ?? '',
    donorPhone: donation.donorPhone ?? '',
    amount: String(donation.amount),
    method: donation.method,
    purpose: donation.purpose ?? '',
    reference: donation.reference ?? '',
    remarks: donation.remarks ?? '',
    receivedOn: donation.receivedOn.slice(0, 10),
  });

  function change(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setProblem(null);
  }

  // ========================================
  // SAVE THE CORRECTION
  // ========================================
  async function save() {
    if (form.donorName.trim().length < 2) {
      setProblem('Please keep the donor name.');
      return;
    }

    const amount = Math.round(Number(form.amount.replace(/[, ]/g, '')) || 0);
    if (amount <= 0) {
      setProblem('The amount must be more than zero.');
      return;
    }

    setSaving(true);
    setProblem(null);

    try {
      const response = await fetch(`/api/admin/donations/${donation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: form.donorName.trim(),
          donorEmail: form.donorEmail.trim() || null,
          donorPhone: form.donorPhone.trim() || null,
          amount,
          method: form.method,
          purpose: form.purpose.trim() || null,
          reference: form.reference.trim() || null,
          remarks: form.remarks.trim() || null,
          receivedOn: form.receivedOn || null,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'The change could not be saved. Please try again.');
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // HIDE THE RECORD
  // ========================================
  async function remove() {
    const sure = window.confirm(
      `Remove this donation?\n\n${donation.donorName} - NPR ${donation.amount}\n\n` +
        'It disappears from every total and from the record list. The history is kept, so it is not destroyed.',
    );

    if (!sure) return;

    setDeleting(true);
    setProblem(null);

    try {
      const response = await fetch(`/api/admin/donations/${donation.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setProblem(payload?.error ?? 'The donation could not be removed. Please try again.');
        return;
      }

      router.refresh();
    } catch {
      setProblem('The website could not be reached. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-3">
      {problem ? (
        <p className="mb-2 rounded-card border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">
          {problem}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen(true)} className="btn btn-outline btn-sm">
          <Icon name="edit" className="h-4 w-4" />
          Edit
        </button>

        <button
          type="button"
          onClick={() => void remove()}
          disabled={deleting}
          className="btn btn-outline btn-sm text-red-700"
          title="Hides the donation. It can be restored from the Removed screen."
        >
          {deleting ? (
            <>
              <Icon name="refresh" className="h-4 w-4 animate-spin" />
              Removing…
            </>
          ) : (
            <>
              <Icon name="trash" className="h-4 w-4" />
              Delete
            </>
          )}
        </button>

        {/* The strong one. It asks for the word DELETE and cannot be undone. */}
        <DonationPermanentDelete
          donation={{
            id: donation.id,
            donorName: donation.donorName,
            amount: donation.amount,
            purpose: donation.purpose,
            receivedOn: donation.receivedOn,
            status: 'RECORD',
            hasReceipt: donation.hasReceipt ?? false,
          }}
        />
      </div>

      {/* ========================================
          THE EDIT FORM
          ======================================== */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 py-10">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit the donation from ${donation.donorName}`}
            className="w-full max-w-2xl rounded-card bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">Edit this donation</h2>
                <p className="mt-1 text-xs text-ink-500">
                  Reference <span className="font-mono">{donation.id}</span>. The status is not changed
                  here - use Verify, Reject or Need more info for that.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-card p-1.5 text-ink-500 hover:bg-ink-100"
                aria-label="Close"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="donorName"
                label="Donor name"
                required
                value={form.donorName}
                onChange={(event) => change('donorName', event.target.value)}
              />
              <TextField
                name="donorEmail"
                label="Email"
                type="email"
                value={form.donorEmail}
                onChange={(event) => change('donorEmail', event.target.value)}
              />
              <TextField
                name="donorPhone"
                label="Mobile number"
                value={form.donorPhone}
                onChange={(event) => change('donorPhone', event.target.value)}
              />
              <TextField
                name="amount"
                label="Amount (NPR)"
                type="number"
                required
                value={form.amount}
                onChange={(event) => change('amount', event.target.value)}
              />
              <SelectField
                name="method"
                label="How it arrived"
                value={form.method}
                onChange={(event) => change('method', event.target.value)}
                options={DONATION_METHOD_OPTIONS}
              />
              <TextField
                name="receivedOn"
                label="Date received"
                type="date"
                value={form.receivedOn}
                onChange={(event) => change('receivedOn', event.target.value)}
              />
              <TextField
                name="reference"
                label="Transaction / receipt number"
                value={form.reference}
                onChange={(event) => change('reference', event.target.value)}
              />
              <TextField
                name="purpose"
                label="Purpose"
                value={form.purpose}
                onChange={(event) => change('purpose', event.target.value)}
              />
              <div className="sm:col-span-2">
                <TextareaField
                  name="remarks"
                  label="Remarks"
                  rows={2}
                  value={form.remarks}
                  onChange={(event) => change('remarks', event.target.value)}
                  hint="A note the office wants to keep about this donation."
                />
              </div>
            </div>

            {problem ? (
              <div className="mt-4">
                <Alert tone="error">{problem}</Alert>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={save} disabled={saving}>
                {saving ? (
                  <>
                    <Icon name="refresh" className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Icon name="save" className="h-4 w-4" />
                    Save the change
                  </>
                )}
              </Button>

              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
