import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// SUPER ADMIN - MASTER DASHBOARD
// ========================================
// Address: /admin/master
//
// ONE SCREEN WITH THE WHOLE ORGANIZATION ON IT
//   members, the monthly contribution, loans, district work and payments -
//   side by side, each in its own block.
//
// IMPORTANT: THE MONEY IS NEVER ADDED TOGETHER
//   These are four different kinds of money and they are shown separately:
//     - the monthly member fund (contributions received)
//     - loans given out and repaid (money out, then coming back)
//     - the fund used on district activities (the office's own note)
//   Adding them into one "total" would be meaningless and misleading, so this
//   page never does it.
//
// WHERE EVERY FIGURE COMES FROM
//   The same modules the detail screens use: lib/fund/collection.ts,
//   lib/loan/calc.ts and lib/district/analytics.ts. Nothing is stored twice.
//
// WHO MAY OPEN IT
//   requireSuperAdmin() - it is the overview of the whole organization.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { formatMoney, monthLabel, monthStart } from '@/lib/fund/calc';
import { getCollectionOverview, getCollectionSeries } from '@/lib/fund/collection';
import { getLoanTotals } from '@/lib/loan/calc';
import { getDistrictAnalytics } from '@/lib/district/analytics';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { readSettingValue } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.master'), robots: { index: false, follow: false } };
}

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

/** A block of cards with its own heading and a link to the detail screen. */
function Block({
  title,
  description,
  href,
  children,
}: {
  title: string;
  description: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
          <p className="mt-1 text-xs text-ink-500">{description}</p>
        </div>
        <Link href={href} className="text-sm font-semibold text-brand-700 hover:underline">
          Open
        </Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

export default async function MasterDashboardPage() {
  await requireSuperAdmin();

  const month = monthStart(new Date());
  const monthlyAmountText = await readSettingValue('fund.monthlyAmount', '20');
  const monthlyAmount = Number(monthlyAmountText) || 20;

  const [collection, loans, districts, series, paymentCounts] = await Promise.all([
    getCollectionOverview(month, monthlyAmount),
    getLoanTotals(),
    getDistrictAnalytics(),
    getCollectionSeries(6, monthlyAmount),
    // Counts (not amounts) of this month's payments, per state.
    isDatabaseConfigured()
      ? Promise.all([
          prisma.fundPayment.count({
            where: { isDeleted: false, status: 'PENDING', periodMonth: month },
          }),
          prisma.fundPayment.count({
            where: { isDeleted: false, status: 'APPROVED', periodMonth: month },
          }),
          prisma.fundPayment.count({
            where: { isDeleted: false, status: 'REJECTED', periodMonth: month },
          }),
        ])
      : Promise.resolve([0, 0, 0]),
  ]);

  const [pendingCount, approvedCount, rejectedCount] = paymentCounts;

  // ---------- Two small extras ----------
  // Worked out here rather than inside the page's markup, so the layout stays
  // readable and nothing is fetched twice.
  const dueDay = await readSettingValue('fund.dueDay', '15');
  const unverifiedCount = isDatabaseConfigured()
    ? await prisma.user.count({ where: { role: 'MEMBER', emailVerifiedAt: null } })
    : 0;

  const chartMax = Math.max(1, ...series.map((point) => Math.max(point.expected, point.collected)));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Super Admin"
        icon="chart"
        title="Master dashboard"
        description={`The whole organization at a glance for ${monthLabel(month)}. Each kind of money is kept separate - they are shown together, never added together.`}
      />

      {/* ========================================
          MEMBERS
          ======================================== */}
      <Block
        title="Members"
        description="Every account, and how many are switched on."
        href="/admin/members"
      >
        <Card
          label="Total members"
          value={String(collection.registeredMembers)}
          icon="users"
          hint="Member accounts in the database"
        />
        <Card
          label="Active members"
          value={String(collection.activeMembers)}
          icon="check-circle"
          tone="good"
          hint="These pay the monthly contribution"
        />
        <Card
          label="Inactive / suspended"
          value={String(collection.inactiveMembers)}
          icon="info"
          hint="Not asked for the monthly contribution"
        />
        <Card
          label="Waiting to verify their email"
          value={String(unverifiedCount)}
          icon="mail"
          tone="warn"
          hint="They cannot sign in until they do"
        />
      </Block>

      {/* ========================================
          MONTHLY CONTRIBUTION
          ======================================== */}
      <Block
        title={`Monthly contribution (${monthLabel(month)})`}
        description={`Rs. ${monthlyAmount} per active member, due on the ${dueDay}th. Only approved payments count as collected.`}
        href="/admin/fund/accounting"
      >
        <Card
          label="Expected this month"
          value={formatMoney(collection.expectedThisMonth)}
          icon="chart"
          hint={`${collection.activeMembers} active members × ${formatMoney(monthlyAmount)}`}
        />
        <Card
          label="Collected this month"
          value={formatMoney(collection.collectedThisMonth)}
          icon="banknote"
          tone="good"
          hint="Approved payments only"
        />
        <Card
          label="Waiting for verification"
          value={formatMoney(collection.pendingThisMonth)}
          icon="clock"
          tone="warn"
          hint="Not counted as collected"
        />
        <Card
          label="Remaining expected"
          value={formatMoney(collection.remainingThisMonth)}
          icon="info"
          tone={collection.remainingThisMonth > 0 ? 'warn' : 'good'}
          hint="Expected − collected"
        />
      </Block>

      {/* ========================================
          LOANS
          ======================================== */}
      <Block
        title="Loans"
        description="Money lent to members, and how much of it has come back. Completely separate from the monthly fund."
        href="/admin/loans"
      >
        <Card
          label="Total loan given"
          value={formatMoney(loans.totalPayable)}
          icon="banknote"
          hint={`${loans.totalLoans} loan(s), ${loans.borrowingMembers} member(s)`}
        />
        <Card
          label="Total returned"
          value={formatMoney(loans.totalRepaid)}
          icon="check-circle"
          tone="good"
          hint={`${loans.repaidPercent}% of everything lent`}
        />
        <Card
          label="Remaining loan balance"
          value={formatMoney(loans.totalOutstanding)}
          icon="clock"
          tone={loans.totalOutstanding > 0 ? 'warn' : 'good'}
          hint="Still to come back"
        />
        <Card
          label="Active loans"
          value={String(loans.activeLoans + loans.partiallyPaidLoans)}
          icon="briefcase"
          hint={`${loans.overdueLoans} overdue · ${loans.completedLoans} completed`}
          tone={loans.overdueLoans > 0 ? 'bad' : 'default'}
        />
      </Block>

      {/* ========================================
          DISTRICT WORK
          ======================================== */}
      <Block
        title="District work"
        description="What the organization has done across the 77 districts."
        href="/admin/districts"
      >
        <Card
          label="Total activities"
          value={String(districts.totalActivities)}
          icon="layers"
          hint={`${districts.districtsWithActivities} of 77 districts`}
        />
        <Card
          label="Districts with activity"
          value={`${districts.districtsWithActivities} / 77`}
          icon="grid"
          hint="Districts that have at least one activity"
        />
        <Card
          label="Total beneficiaries"
          value={String(districts.totalBeneficiaries)}
          icon="users"
          hint={
            districts.activitiesWithoutFigures > 0
              ? `${districts.activitiesWithoutFigures} activity(ies) recorded no figure`
              : 'Every activity has a figure'
          }
        />
        <Card
          label="Members involved"
          value={String(districts.totalMembersInvolved)}
          icon="user"
          hint="Our own members who took part"
        />
      </Block>

      {/* ========================================
          PAYMENTS THIS MONTH
          ======================================== */}
      <Block
        title="Payment activity"
        description={`How many payment submissions came in during ${monthLabel(month)}.`}
        href="/admin/fund/pending"
      >
        <Card
          label="Waiting to be verified"
          value={String(pendingCount)}
          icon="clock"
          tone={pendingCount > 0 ? 'warn' : 'good'}
          hint="Open Payment verification to approve or refuse them"
        />
        <Card
          label="Approved"
          value={String(approvedCount)}
          icon="check-circle"
          tone="good"
          hint="Counted as money received"
        />
        <Card
          label="Rejected"
          value={String(rejectedCount)}
          icon="close"
          tone={rejectedCount > 0 ? 'bad' : 'default'}
          hint="Never counted as money received"
        />
        <Card
          label="Collected overall"
          value={formatMoney(collection.collectedOverall)}
          icon="banknote"
          hint={`${collection.approvedPaymentsOverall} approved payment(s) ever`}
        />
      </Block>

      {/* ========================================
          THE LAST SIX MONTHS
          ======================================== */}
      <section className="card p-5">
        <h2 className="font-display text-base font-bold text-ink-900">The last six months</h2>
        <p className="mt-1 text-xs text-ink-500">
          Expected against collected, month by month. The full history is on the accounting screen.
        </p>

        <div className="mt-4 space-y-3">
          {series.map((point) => (
            <div key={point.key} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-3">
              <span className="text-sm font-medium text-ink-800">{point.label}</span>
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-200"
                    style={{ width: `${Math.round((point.expected / chartMax) * 100)}%` }}
                  />
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.round((point.collected / chartMax) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-ink-500">
                  Collected {formatMoney(point.collected)} of {formatMoney(point.expected)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================
          A NOTE THAT KEEPS THE FIGURES HONEST
          ======================================== */}
      <section className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">
          Why these four blocks are never added together
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li className="flex gap-2">
            <Icon name="banknote" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>Monthly contribution</strong> is money members have handed over. Only approved
              payments are counted.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="briefcase" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>Loans</strong> are money that has LEFT the fund and is expected back. Adding
              the amount lent to the amount collected would count the same rupees twice.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="layers" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>District work</strong> figures are the office's own record of what each
              activity cost and how many people it reached. They are not part of the balance.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
