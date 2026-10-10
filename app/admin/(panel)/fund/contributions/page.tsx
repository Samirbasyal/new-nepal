// ========================================
// ADMIN PANEL - MONTHLY CONTRIBUTION TRACKING
// ========================================
// Address: /admin/fund/contributions?month=2026-10
//
// THE MONTH-BY-MONTH TABLE, for example:
//
//   Member A | Oct 2026 | Required 1000 | Paid 1000 | Paid
//   Member B | Oct 2026 | Required 1000 | Paid 0    | Pending
//
// HOW A MONTH IS CREATED
//   Use the "Create this month" button. It adds one row for every active
//   member using the monthly amount from Admin Panel -> Settings. Members who
//   already have a row for that month are left alone.
//
// HOW THE STATUS IS DECIDED
//   Never by hand. lib/fund/calc.ts recalculates "paid" from APPROVED payments
//   every time a payment is approved, rejected or cancelled. That is what keeps
//   this table and the payment list in perfect agreement.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { ensureContributionsForMonth, formatMoney, monthKey, monthLabel, monthStart } from '@/lib/fund/calc';
import { readSettingValue } from '@/lib/settings';
import { SectionHeading } from '@/components/ui/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusChip } from '@/components/admin/FundCharts';
import { GenerateMonthButton } from '@/components/admin/GenerateMonthButton';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Monthly tracking',
  robots: { index: false, follow: false },
};

export default async function AdminContributionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  if (!isDatabaseConfigured()) {
    return <EmptyState icon="alert" title="The database is not set up yet" description="" />;
  }

  const params = await searchParams;
  const rawMonth = Array.isArray(params.month) ? params.month[0] : params.month;

  // Default to the current month.
  const month = rawMonth ? monthStart(new Date(`${rawMonth}-01`)) : monthStart(new Date());
  const currentKey = monthKey(month);

  const monthlyAmountText = await readSettingValue('fund.monthlyAmount', '20');
  const monthlyAmount = Number(monthlyAmountText) || 20;

  // ---------- Open the month automatically ----------
  // Every ACTIVE member gets a Rs. 20 row for this month the first time this
  // screen is opened, so the office never has to remember to "start" a month.
  // Existing rows are left exactly as they are, so opening the page again never
  // changes a month that has already been paid. The "Create this month" button
  // is still available for doing it by hand.
  await ensureContributionsForMonth(month, monthlyAmount);

  const rows = await prisma.monthlyContribution.findMany({
    // Only real MEMBERS appear here. An administrator never has a monthly
    // contribution, so an odd row for an admin account (for example one left
    // behind by testing) can never be mistaken for somebody who owes money.
    where: { periodMonth: month, member: { role: 'MEMBER' } },
    // Unpaid members first, so the office sees who to chase.
    orderBy: [{ status: 'asc' }, { member: { name: 'asc' } }],
    include: { member: { select: { id: true, name: true, email: true, isActive: true } } },
  });

  const totals = {
    required: rows.reduce((sum, row) => sum + row.requiredAmount, 0),
    collected: rows.reduce((sum, row) => sum + row.paidAmount, 0),
    paid: rows.filter((row) => row.status === 'PAID').length,
    unpaid: rows.filter((row) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(row.status)).length,
    waived: rows.filter((row) => row.status === 'WAIVED').length,
  };

  // The previous and next month, for the arrows in the header.
  const previous = monthKey(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const next = monthKey(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          eyebrow="Fund management"
          title="Monthly contribution tracking"
          description="Who has paid their monthly fund and who has not."
        />
        <Link href="/admin/fund" className="btn btn-outline btn-sm">
          <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
          Back to dashboard
        </Link>
      </div>

      {/* ========================================
          MONTH PICKER + CREATE BUTTON
          ======================================== */}
      <div className="card flex flex-wrap items-end justify-between gap-4 p-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/fund/contributions?month=${previous}`}
            className="btn btn-outline btn-sm"
            aria-label="Previous month"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
          </Link>

          <form method="get" className="flex items-end gap-2">
            <label className="block">
              <span className="label">Month</span>
              <input type="month" name="month" defaultValue={currentKey} className="input" />
            </label>
            <button type="submit" className="btn btn-primary btn-sm">
              Show
            </button>
          </form>

          <Link
            href={`/admin/fund/contributions?month=${next}`}
            className="btn btn-outline btn-sm"
            aria-label="Next month"
          >
            <Icon name="chevron-right" className="h-4 w-4" />
          </Link>
        </div>

        <GenerateMonthButton month={currentKey} defaultAmount={monthlyAmount} />
      </div>

      {/* ========================================
          SUMMARY
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label={`Required in ${monthLabel(month)}`} value={formatMoney(totals.required)} />
        <SummaryCard label="Collected so far" value={formatMoney(totals.collected)} />
        <SummaryCard label="Members who paid" value={String(totals.paid)} />
        <SummaryCard label="Members still to pay" value={String(totals.unpaid)} />
      </div>

      {/* ========================================
          THE TABLE
          ======================================== */}
      {rows.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={`Nothing recorded for ${monthLabel(month)} yet`}
          description="Use the Create this month button above to add a row for every active member."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Required</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink-900">
                        {row.member?.name ?? 'Unknown member'}
                      </span>
                      {row.member && !row.member.isActive ? (
                        <span className="ml-2 text-xs text-danger-600">deactivated</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink-700">{monthLabel(row.periodMonth)}</td>
                    <td className="px-4 py-3 text-ink-700">{formatMoney(row.requiredAmount)}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {formatMoney(row.paidAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-500">
        Tip: a month is only marked Paid when the money has been verified. Approve payments in
        Payment verification and this table updates automatically.
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-ink-600">{label}</p>
      <p className="mt-2 font-display text-xl font-bold text-ink-900">{value}</p>
    </div>
  );
}
