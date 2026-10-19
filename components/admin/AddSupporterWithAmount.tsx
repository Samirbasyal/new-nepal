// ========================================
// ADD A SUPPORTER AND THEIR GIFT IN ONE PLACE
// ========================================
// Shown at the top of Admin Panel -> Donors & supporters.
//
// The old way: add the person on this page, then remember to go to Supporter
// donations and add the money. Most people added the person and stopped, so the
// total looked empty.
//
// Now: name + amount here, one Save. The profile and the donation are written
// together by /api/admin/donors-with-donation.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

export function AddSupporterWithAmount() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function save() {
    if (busy) return;

    setError(null);
    setDone(null);

    if (name.trim().length < 2) {
      setError('Please write the supporter name.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch('/api/admin/donors-with-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organization, amount, purpose }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'The supporter could not be saved.');
        return;
      }

      setDone(
        Number(amount) > 0
          ? `${name.trim()} was added with a donation of NPR ${Number(amount).toLocaleString('en-IN')}.`
          : `${name.trim()} was added.`,
      );

      setName('');
      setOrganization('');
      setAmount('');
      setPurpose('');
      router.refresh();
    } catch {
      setError('The supporter could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Add a supporter with a donation</h2>
          <p className="mt-1 text-sm text-ink-600">
            Enter the person and the money they gave together. The total is calculated for you.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setError(null);
            setDone(null);
          }}
          className="btn btn-primary btn-sm"
        >
          <Icon name={open ? 'chevron-down' : 'plus'} className="h-4 w-4" />
          {open ? 'Close' : 'New supporter'}
        </button>
      </div>

      {done ? (
        <div className="mt-4 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {done}
        </div>
      ) : null}

      {open ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Name *</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Birendra Sharki"
            />
          </label>

          <label className="block">
            <span className="label">Organization (optional)</span>
            <input
              className="input"
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="label">Donation amount (NPR)</span>
            <input
              className="input"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 1600"
            />
          </label>

          <label className="block">
            <span className="label">Purpose (optional)</span>
            <input
              className="input"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="e.g. Education support"
            />
          </label>

          {error ? (
            <p className="sm:col-span-2 rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <button type="button" onClick={() => void save()} disabled={busy} className="btn btn-primary">
              {busy ? (
                <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                  <Icon name="refresh" className="h-4 w-4 animate-spin" />
                  Please wait...
                </span>
              ) : (
                'Save supporter'
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
