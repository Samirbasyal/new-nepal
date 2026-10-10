// ========================================
// ADMIN PANEL - FUND MANAGEMENT DASHBOARD
// ========================================
// Address: /admin/fund?preset=month   (or today / week / year / custom)
//
// EVERY NUMBER ON THIS PAGE IS CALCULATED BY lib/fund/calc.ts FROM REAL
// DATABASE RECORDS. Nothing is hard-coded and nothing is estimated.
//
// THE NINE SUMMARY CARDS (as requested)
//   1. Total fund collected   2. Total fund spent   3. Available balance
//   4. Pending payments       5. Expected / upcoming fund
//   6. This month collection  7. This month expense
//   8. Members who paid       9. Members pending
//
// THE CHARTS
//   Monthly collection + expense, fund balance trend, payment status donut,
//   bank-wise collection and category-wise expenses.
//
// The date filter is a plain HTML form, so it works even with JavaScript
// switched off and needs no extra code.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeading } from '@/components/ui/Section';
import { Icon, type IconName } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BalanceTrendLine,
  CollectionExpenseBars,
  SimpleBars,
  StatusDonut,
} from '@/components/admin/FundCharts';
import {
  formatMoney,
  getBankWiseCollection,
  getExpenseCategoryBreakdown,
  getFundSummary,
  getMonthlySeries,
  getPaymentStatusDistribution,
  resolveDateRange,
} from '@/lib/fund/calc';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fund management',
  robots: { index: false, follow: false },
};

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

export default async function AdminFundDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const first = (key: string): string | null => {
    const value = params[key];
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  };

  const range = resolveDateRange(first('preset'), first('from'), first('to'));

  const [summary, series, statusSlices, bankRows, categoryRows, pendingQueue] = await Promise.all([
    getFundSummary(range),
    getMonthlySeries(range),
    getPaymentStatusDistribution(range),
    getBankWiseCollection(range),
    getExpenseCategoryBreakdown(range),
    // The five oldest payments still waiting for verification.
    isDatabaseConfigured()
      ? prisma.fundPayment.findMany({
          where: { status: 'PENDING', isDeleted: false },
          orderBy: { submittedAt: 'asc' },
          take: 5,
          include: { member: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const cards: { label: string; value: string; hint: string; icon: IconName; tone: string }[] = [
    {
      label: 'Total fund collected',
      value: formatMoney(summary.collection, summary.currency),
      hint: `${range.label} · approved payments only`,
      icon: 'download',
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      label: 'Total fund spent',
      value: formatMoney(summary.expense, summary.currency),
      hint: `${range.label} · approved expenses only`,
      icon: 'briefcase',
      tone: 'bg-accent-50 text-accent-700',
    },
    {
      label: 'Available balance',
      value: formatMoney(summary.allTimeBalance, summary.currency),
      hint: 'All time · real balance of the organization',
      icon: 'shield',
      tone: 'bg-green-50 text-green-700',
    },
    {
      label: 'Pending payments',
      value: formatMoney(summary.pendingAmount, summary.currency),
      hint: `${summary.pendingCount} payment(s) waiting for verification`,
      icon: 'clock',
      tone: 'bg-amber-50 text-amber-800',
    },
    {
      label: 'Expected / upcoming fund',
      value: formatMoney(summary.expectedFund, summary.currency),
      hint: 'Unpaid part of every open month',
      icon: 'target',
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'This month collection',
      value: formatMoney(summary.monthCollection, summary.currency),
      hint: 'Current calendar month',
      icon: 'chart',
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      label: 'This month expense',
      value: formatMoney(summary.monthExpense, summary.currency),
      hint: 'Current calendar month',
      icon: 'activity',
      tone: 'bg-accent-50 text-accent-700',
    },
    {
      label: 'Members who paid',
      value: String(summary.membersPaid),
      hint: 'Members with an approved payment this month',
      icon: 'users',
      tone: 'bg-green-50 text-green-700',
    },
    {
      label: 'Members pending',
      value: String(summary.membersPending),
      hint: 'Members who still owe this month',
      icon: 'alert',
      tone: 'bg-red-50 text-red-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ========================================
          PAGE HEADER + DATE RANGE FILTER
          ======================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Fund management"
          title="Donation & fund dashboard"
          description="Collections, expenses and the live balance of the organization."
        />

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/fund/pending" className="btn btn-primary btn-sm">
            <Icon name="check" className="h-4 w-4" />
            Verify payments
          </Link>
          <Link href="/admin/fund/reports" className="btn btn-outline btn-sm">
            <Icon name="folder" className="h-4 w-4" />
            Reports
          </Link>
        </div>
      </div>

      {/* Plain HTML form: works without JavaScript, no extra code needed. */}
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
              href={`/admin/fund?preset=${preset.value}`}
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
          SUMMARY CARDS
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink-600">{card.label}</p>
              <span className={`rounded-btn p-2 ${card.tone}`}>
                <Icon name={card.icon} className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-ink-900">{card.value}</p>
            <p className="mt-1 text-xs text-ink-500">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* ========================================
          WAITING FOR VERIFICATION (quick list)
          ======================================== */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-ink-900">
            Waiting for verification
          </h3>
          <Link href="/admin/fund/pending" className="text-sm font-semibold text-brand-700 hover:underline">
            Open the queue
          </Link>
        </div>

        {pendingQueue.length === 0 ? (
          <EmptyState
            icon="check"
            title="Nothing is waiting"
            description="Every submitted payment has been reviewed. New submissions appear here automatically."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {pendingQueue.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-ink-900">{payment.member?.name ?? 'Member'}</p>
                  <p className="text-sm text-ink-500">
                    {formatMoney(payment.amount)} · {payment.transactionId}
                  </p>
                </div>
                <span className="text-xs text-ink-500">
                  submitted {payment.submittedAt.toLocaleDateString('en-GB')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ========================================
          CHARTS
          ======================================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-display text-lg font-bold text-ink-900">
            Monthly collection and expense
          </h3>
          <CollectionExpenseBars points={series} />
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-display text-lg font-bold text-ink-900">Fund balance trend</h3>
          <BalanceTrendLine points={series} />
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-display text-lg font-bold text-ink-900">
            Payment status distribution
          </h3>
          <StatusDonut slices={statusSlices} />
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-display text-lg font-bold text-ink-900">
            Collection by bank
          </h3>
          <SimpleBars rows={bankRows} />
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-bold text-ink-900">
            Expense by category
          </h3>
          <SimpleBars rows={categoryRows} />
        </div>
      </div>

      {/* ========================================
          QUICK LINKS
          ======================================== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/admin/fund/collections', label: 'Collections', icon: 'download' as IconName },
          { href: '/admin/fund/contributions', label: 'Monthly tracking', icon: 'calendar' as IconName },
          { href: '/admin/fund/expenses', label: 'Expenses', icon: 'briefcase' as IconName },
          { href: '/admin/fund/banks', label: 'Banks & QR', icon: 'banknote' as IconName },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card flex items-center gap-3 p-4 transition hover:shadow-card-hover"
          >
            <span className="rounded-btn bg-ink-100 p-2 text-ink-700">
              <Icon name={link.icon} className="h-4 w-4" />
            </span>
            <span className="font-medium text-ink-800">{link.label}</span>
            <Icon name="chevron-right" className="ml-auto h-4 w-4 text-ink-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
