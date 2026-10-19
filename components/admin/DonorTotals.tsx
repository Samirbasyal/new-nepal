// ========================================
// ADMIN PANEL - WHAT EACH SUPPORTER HAS GIVEN
// ========================================
// A list of Donors & Supporters with two numbers that are always worked out from
// the donation transactions, never typed:
//
//   Confirmed  = the sum of VERIFIED donations only
//   Waiting    = the sum of PENDING donations (not counted as money received)
//
// A supporter can give many times. Every gift is its own row, so nothing is ever
// overwritten and the total is simply the sum.
// ========================================

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export type DonorTotalRow = {
  id: string;
  name: string;
  organization: string | null;
  confirmed: number;
  pending: number;
  count: number;
};

function npr(value: number): string {
  return `NPR ${value.toLocaleString('en-IN')}`;
}

export function DonorTotals({ rows }: { rows: DonorTotalRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        (row.organization ?? '').toLowerCase().includes(needle),
    );
  }, [rows, query]);

  const totalConfirmed = rows.reduce((sum, row) => sum + row.confirmed, 0);

  function openForm(row: DonorTotalRow) {
    setOpenId(row.id);
    setAmount('');
    setPurpose('');
    setError(null);
    setMessage(null);
  }

  async function save(donorId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/donor-donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donorId, amount, purpose }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'The donation could not be saved.');
        return;
      }

      setMessage(payload.message ?? 'Donation recorded.');
      setOpenId(null);
      setAmount('');
      setPurpose('');
      // Re-read the totals from the server so the numbers are the database's.
      router.refresh();
    } catch {
      setError('The website could not be reached. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search supporters"
            className="w-full rounded-btn border border-ink-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <p className="text-sm text-ink-600">
          Confirmed in total:{' '}
          <strong className="text-ink-900">{npr(totalConfirmed)}</strong>
        </p>
      </div>

      {message ? (
        <div className="rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-500">
          {query ? 'No supporter matches that search.' : 'No supporters have been added yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-3 py-2">Supporter</th>
                <th className="px-3 py-2">Confirmed</th>
                <th className="px-3 py-2">Waiting</th>
                <th className="px-3 py-2">Gifts</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-ink-100 align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink-900">{row.name}</p>
                    {row.organization ? (
                      <p className="text-xs text-ink-500">{row.organization}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-semibold text-green-700">{npr(row.confirmed)}</td>
                  <td className="px-3 py-3 text-amber-700">
                    {row.pending > 0 ? npr(row.pending) : '—'}
                  </td>
                  <td className="px-3 py-3 text-ink-600">{row.count}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => (openId === row.id ? setOpenId(null) : openForm(row))}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
                    >
                      <Icon name="plus" className="h-3.5 w-3.5" />
                      Record a gift
                    </button>

                    {openId === row.id ? (
                      <div className="mt-3 rounded-card border border-ink-200 bg-ink-50 p-3 text-left">
                        <label className="text-xs font-semibold text-ink-700" htmlFor={`amount-${row.id}`}>
                          Amount (NPR)
                        </label>
                        <input
                          id={`amount-${row.id}`}
                          type="number"
                          min={1}
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder="29999"
                          className="mt-1 w-full rounded-btn border border-ink-300 px-3 py-2 text-sm"
                        />

                        <label className="mt-2 block text-xs font-semibold text-ink-700" htmlFor={`purpose-${row.id}`}>
                          Purpose (optional)
                        </label>
                        <input
                          id={`purpose-${row.id}`}
                          value={purpose}
                          onChange={(event) => setPurpose(event.target.value)}
                          placeholder="Education fund"
                          className="mt-1 w-full rounded-btn border border-ink-300 px-3 py-2 text-sm"
                        />

                        <button
                          type="button"
                          onClick={() => void save(row.id)}
                          disabled={busy}
                          className={cn(
                            'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand-600 px-3 py-2 text-sm font-semibold text-white',
                            busy ? 'cursor-progress opacity-90' : 'hover:bg-brand-700',
                          )}
                        >
                          {busy ? (
                            <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                              <Icon name="refresh" className="h-4 w-4 animate-spin" />
                              Please wait…
                            </span>
                          ) : (
                            'Save (waiting for verification)'
                          )}
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
