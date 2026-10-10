// ========================================
// ADMIN PANEL - FUND REPORTS & EXPORT
// ========================================
// Address: /admin/fund/reports
//
// Pick a date range, then download any report as a spreadsheet (CSV).
// CSV opens directly in Excel, Google Sheets and LibreOffice.
//
// WHY CSV AND NOT PDF
//   The project has no PDF library installed, and adding one would slow the
//   build and the deployment for very little benefit. CSV is the format an
//   accountant actually wants, because the numbers can be recalculated.
//
// Every report is built by /api/admin/fund/reports, which uses the same
// lib/fund/calc.ts rules as the dashboard - so a report can never disagree
// with the balance.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { formatMoney, getFundSummary, resolveDateRange } from '@/lib/fund/calc';
import { SectionHeading } from '@/components/ui/Section';
import { Icon, type IconName } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fund reports',
  robots: { index: false, follow: false },
};

const REPORTS: { value: string; label: string; description: string; icon: IconName }[] = [
  {
    value: 'collections',
    label: 'Monthly collection report',
    description: 'Every approved payment with member, amount, bank and transaction ID.',
    icon: 'download',
  },
  {
    value: 'expenses',
    label: 'Monthly expense report',
    description: 'Every approved expense with category, vendor and reference.',
    icon: 'briefcase',
  },
  {
    value: 'member-payments',
    label: 'Member-wise contribution report',
    description: 'One row per member: how many payments, total contributed, last payment.',
    icon: 'users',
  },
  {
    value: 'pending-payments',
    label: 'Pending payment report',
    description: 'Payments still waiting for verification, oldest first.',
    icon: 'clock',
  },
  {
    value: 'bank-wise',
    label: 'Bank-wise collection report',
    description: 'How much came in through each bank account.',
    icon: 'building',
  },
  {
    value: 'category-wise',
    label: 'Category-wise expense report',
    description: 'How much was spent in each expense category.',
    icon: 'layers',
  },
  {
    value: 'member-contributions',
    label: 'Member contribution report',
    description: 'Contribution totals for the selected period.',
    icon: 'banknote',
  },
  {
    value: 'transactions',
    label: 'Date-wise transaction report',
    description: 'Every payment of any status - useful for reconciliation.',
    icon: 'list',
  },
  {
    value: 'balance',
    label: 'Fund balance report',
    description: 'Collected, spent, balance, pending and expected fund.',
    icon: 'chart',
  },
];

const PRESETS = [
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export default async function AdminFundReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const first = (key: string): string | null => {
    const value = params[key];
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  };

  const range = resolveDateRange(first('preset') ?? 'month', first('from'), first('to'));
  const summary = await getFundSummary(range);

  // The query string that carries the chosen range into every download link.
  const rangeQuery = `preset=${range.preset}${
    range.preset === 'custom'
      ? `&from=${first('from') ?? ''}&to=${first('to') ?? ''}`
      : ''
  }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          eyebrow="Fund management"
          title="Reports & export"
          description="Download the numbers you need for meetings, audits and donor updates."
        />
        <Link href="/admin/fund" className="btn btn-outline btn-sm">
          <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
          Back to dashboard
        </Link>
      </div>

      {/* ========================================
          DATE RANGE
          ======================================== */}
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="preset" value="custom" />

        <label className="block">
          <span className="label">From</span>
          <input
            type="date"
            name="from"
            defaultValue={range.from ? range.from.toISOString().slice(0, 10) : ''}
            className="input"
          />
        </label>

        <label className="block">
          <span className="label">To</span>
          <input
            type="date"
            name="to"
            defaultValue={range.to ? range.to.toISOString().slice(0, 10) : ''}
            className="input"
          />
        </label>

        <button type="submit" className="btn btn-primary">
          Apply range
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Link
              key={preset.value}
              href={`/admin/fund/reports?preset=${preset.value}`}
              className={`rounded-btn px-3 py-1.5 text-sm font-medium ${
                range.preset === preset.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
              }`}
            >
              {preset.label}
            </Link>
          ))}
        </div>
      </form>

      {/* ========================================
          QUICK SUMMARY FOR THE CHOSEN RANGE
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label={`Collected · ${range.label}`} value={formatMoney(summary.collection)} />
        <Card label={`Spent · ${range.label}`} value={formatMoney(summary.expense)} />
        <Card label="Balance (all time)" value={formatMoney(summary.allTimeBalance)} />
        <Card label="Pending (not counted)" value={formatMoney(summary.pendingAmount)} />
      </div>

      {/* ========================================
          THE REPORT LIST
          ======================================== */}
      <div className="card divide-y divide-ink-100">
        {REPORTS.map((report) => (
          <div
            key={report.value}
            className="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="rounded-btn bg-ink-100 p-2 text-ink-700">
                <Icon name={report.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-ink-900">{report.label}</p>
                <p className="text-sm text-ink-500">{report.description}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href={`/api/admin/fund/reports?report=${report.value}&${rangeQuery}&format=csv`}
                className="btn btn-primary btn-sm"
              >
                <Icon name="download" className="h-4 w-4" />
                CSV
              </a>
              <a
                href={`/api/admin/fund/reports?report=${report.value}&${rangeQuery}&format=json`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <Icon name="external-link" className="h-4 w-4" />
                Preview
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-500">
        Exporting the same period twice always produces the same numbers, because every report is
        calculated from the approved records at the moment you download it.
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-ink-600">{label}</p>
      <p className="mt-2 font-display text-xl font-bold text-ink-900">{value}</p>
    </div>
  );
}
