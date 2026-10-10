// ========================================
// SUPER ADMIN - MONTHLY COLLECTION ACCOUNTING
// ========================================
// Address: /admin/fund/accounting?month=2026-10
//
// WHAT THIS SCREEN IS FOR
//   One place that answers the questions the committee actually asks:
//     how many members are there, how many paid, how much was expected,
//     how much came in, how much is still missing - this month and overall.
//
// WHERE EVERY NUMBER COMES FROM
//   lib/fund/collection.ts, which reads the rows in the database. Nothing on
//   this page is typed in, and nothing is stored as a total.
//
// THE RULE THAT MATTERS
//   Only APPROVED payments count as money received. Money that is waiting to be
//   verified is shown on its own card, so nobody mistakes a promise for cash.
//
// LOANS ARE NOT HERE
//   Loan money is a different kind of money and has its own screens
//   (/admin/loans). The two are never added together.
//
// WHO MAY OPEN IT
//   requireSuperAdmin() - the organization asked for this to be a Super Admin
//   view. (To let Finance Administrators see it too, change the guard on line
//   below to requireFinanceAccess().)
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/Section';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { formatMoney, monthLabel, monthStart, addMonths } from '@/lib/fund/calc';
import { getCollectionOverview, getCollectionSeries } from '@/lib/fund/collection';
import { readSettingValue } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Monthly collection accounting',
  robots: { index: false, follow: false },
};

// ========================================
// ONE CARD
// ========================================
function Card({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneClasses = {
    default: 'text-ink-900',
    good: 'text-green-700',
    warn: 'text-amber-700',
    bad: 'text-red-700',
  }[tone];

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <Icon name={icon} className="h-4 w-4 shrink-0 text-ink-400" />
      </div>
      <p className={`mt-2 font-display text-xl font-bold ${toneClasses}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

/** Turn "2026-10" into a Date, falling back to this month. */
function parseMonth(value: string | undefined): Date {
  if (!value) return monthStart(new Date());
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return monthStart(new Date());
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return monthStart(new Date());
  return monthStart(new Date(year, month, 1));
}

export default async function CollectionAccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireSuperAdmin();

  const params = await searchParams;
  const month = parseMonth(params.month);

  const monthlyAmountText = await readSettingValue('fund.monthlyAmount', '20');
  const monthlyAmount = Number(monthlyAmountText) || 20;

  const [overview, series] = await Promise.all([
    getCollectionOverview(month, monthlyAmount),
    getCollectionSeries(12, monthlyAmount),
  ]);

  const previousKey = `${addMonths(month, -1).getFullYear()}-${String(addMonths(month, -1).getMonth() + 1).padStart(2, '0')}`;
  const nextKey = `${addMonths(month, 1).getFullYear()}-${String(addMonths(month, 1).getMonth() + 1).padStart(2, '0')}`;

  // The largest bar in the chart, so the bars are drawn to scale.
  const chartMax = Math.max(
    1,
    ...series.map((point) => Math.max(point.expected, point.collected)),
  );

  const monthRangeFrom = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`;
  const monthRangeTo = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-28`;
  const csvBase = `/api/admin/fund/reports?from=${monthRangeFrom}&to=${monthRangeTo}&format=csv`;

  return (
    <div className="space-y-8">
      {/* ========================================
          HEADER + MONTH PICKER
          ======================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Super Admin"
          icon="chart"
          title="Monthly collection accounting"
          description="Member contributions only. Loans, donations and expenses are kept on their own screens and are never added to these figures."
        />

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/fund/accounting?month=${previousKey}`} className="btn btn-outline btn-sm">
            <Icon name="chevron-left" className="h-4 w-4" />
            Previous month
          </Link>
          <span className="rounded-btn bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
            {overview.monthLabel}
          </span>
          <Link href={`/admin/fund/accounting?month=${nextKey}`} className="btn btn-outline btn-sm">
            Next month
            <Icon name="chevron-right" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ========================================
          THE 13 CARDS
          ======================================== */}
      <section id="collection-overview">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* ---- members ---- */}
          <Card
            label="Registered members"
            value={String(overview.registeredMembers)}
            hint="Every member account ever created"
            icon="users"
          />
          <Card
            label="Active members"
            value={String(overview.activeMembers)}
            hint="These are the members who owe the monthly contribution"
            icon="users"
            tone="good"
          />
          <Card
            label="Inactive / suspended"
            value={String(overview.inactiveMembers)}
            hint="Not asked for the monthly contribution"
            icon="info"
          />
          <Card
            label="Members who paid"
            value={String(overview.membersPaid + overview.membersPartlyPaid)}
            hint={`${overview.membersPaid} paid in full, ${overview.membersPartlyPaid} part paid`}
            icon="check-circle"
            tone="good"
          />
          <Card
            label="Members who have not paid"
            value={String(overview.membersNotPaid)}
            hint={`For ${overview.monthLabel}`}
            icon="clock"
            tone={overview.membersNotPaid > 0 ? 'warn' : 'good'}
          />

          {/* ---- this month ---- */}
          <Card
            label="Expected this month"
            value={formatMoney(overview.expectedThisMonth)}
            hint={`${overview.activeMembers} active members × ${formatMoney(overview.monthlyAmount)}`}
            icon="chart"
          />
          <Card
            label="Collected this month"
            value={formatMoney(overview.collectedThisMonth)}
            hint={`${overview.submissionsThisMonth} payment(s) submitted, approved only`}
            icon="banknote"
            tone="good"
          />
          <Card
            label="Remaining expected"
            value={formatMoney(overview.remainingThisMonth)}
            hint="Expected − collected"
            icon="clock"
            tone={overview.remainingThisMonth > 0 ? 'warn' : 'good'}
          />
          <Card
            label="Waiting for verification"
            value={formatMoney(overview.pendingThisMonth)}
            hint="Submitted by members, not yet approved - NOT counted as collected"
            icon="info"
            tone={overview.pendingThisMonth > 0 ? 'warn' : 'default'}
          />
          <Card
            label="Rejected this month"
            value={formatMoney(overview.rejectedThisMonth)}
            hint="Never counted as collected"
            icon="info"
            tone={overview.rejectedThisMonth > 0 ? 'bad' : 'default'}
          />

          {/* ---- previous month ---- */}
          <Card
            label={`Collected in ${overview.previousMonthLabel}`}
            value={formatMoney(overview.collectedPreviousMonth)}
            hint={`Expected ${formatMoney(overview.expectedPreviousMonth)}`}
            icon="calendar"
          />

          {/* ---- all time ---- */}
          <Card
            label="Collected overall"
            value={formatMoney(overview.collectedOverall)}
            hint={`${overview.approvedPaymentsOverall} approved payment(s)`}
            icon="banknote"
            tone="good"
          />
          <Card
            label="Expected overall"
            value={formatMoney(overview.expectedOverall)}
            hint="Every month that has been opened so far"
            icon="chart"
          />
        </div>
      </section>

      {/* ========================================
          MONTH BY MONTH (chart + history)
          ======================================== */}
      <section id="collection-history" className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeading
            eyebrow="Collection history"
            icon="chart"
            title="The last 12 months"
            description="Expected and collected for each month. Older months are never deleted, so this history keeps growing."
          />

          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/admin/fund/contributors`} variant="outline" size="sm">
              <Icon name="users" className="h-4 w-4" />
              Member-wise report
            </ButtonLink>
            <ButtonLink href="/admin/fund/reports" variant="outline" size="sm">
              <Icon name="download" className="h-4 w-4" />
              All reports &amp; CSV
            </ButtonLink>
          </div>
        </div>

        {series.length === 0 ? (
          <p className="mt-4 rounded-card bg-ink-50 p-4 text-sm text-ink-600">
            There is nothing to show yet. Once members start paying, each month appears here.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {/* A simple, readable bar for each month. Drawn with plain boxes so
                it stays fast and works on a phone without any extra library. */}
            <div className="hidden sm:flex sm:items-center sm:gap-3 sm:text-xs sm:text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded bg-brand-200" />
                Expected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded bg-brand-600" />
                Collected
              </span>
            </div>

            <div className="space-y-3">
              {series.map((point) => (
                <div key={point.key} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-3">
                  <div className="flex items-baseline justify-between gap-2 sm:block">
                    <span className="text-sm font-medium text-ink-800">{point.label}</span>
                    <span className="text-xs text-ink-500 sm:hidden">
                      {formatMoney(point.collected)} / {formatMoney(point.expected)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-200"
                        style={{ width: `${Math.round((point.expected / chartMax) * 100)}%` }}
                        title={`Expected ${formatMoney(point.expected)}`}
                      />
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.round((point.collected / chartMax) * 100)}%` }}
                        title={`Collected ${formatMoney(point.collected)}`}
                      />
                    </div>
                    <p className="hidden text-xs text-ink-500 sm:block">
                      Collected {formatMoney(point.collected)} of {formatMoney(point.expected)}
                      {point.remaining > 0 ? ` · ${formatMoney(point.remaining)} remaining` : ' · complete'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ========================================
          DOWNLOADS FOR THIS MONTH
          ======================================== */}
      <section className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">
          Download {monthLabel(month)} for the committee meeting
        </h3>
        <p className="mt-2 text-sm text-ink-600">
          CSV files open in Excel and Google Sheets, and the amounts can be recalculated there.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`${csvBase}&report=collections`} className="btn btn-primary btn-sm">
            <Icon name="download" className="h-4 w-4" />
            Collections this month
          </a>
          <a href={`${csvBase}&report=member-contributions`} className="btn btn-outline btn-sm">
            <Icon name="download" className="h-4 w-4" />
            Member contributions
          </a>
          <a href={`${csvBase}&report=balance`} className="btn btn-outline btn-sm">
            <Icon name="download" className="h-4 w-4" />
            Fund balance
          </a>
          <a href={`${csvBase}&report=pending-payments`} className="btn btn-outline btn-sm">
            <Icon name="download" className="h-4 w-4" />
            Still pending
          </a>
        </div>

        <p className="mt-4 text-xs text-ink-500">
          A member who is not on these lists can be found on the{' '}
          <Link href="/admin/fund/contributors" className="font-semibold text-brand-700 hover:underline">
            member-wise report
          </Link>
          , where you can search by name, email, membership number or district.
        </p>
      </section>
    </div>
  );
}
