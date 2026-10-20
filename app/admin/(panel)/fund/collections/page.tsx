import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - MONTHLY FUND RECORDS
// ========================================
// Address: /admin/fund/collections?month=2026-10
//
// WHAT THIS SCREEN IS
//   The dedicated record of MEMBER FUND money: who paid, how much, for which
//   month, how they paid, whether the office has verified it, and by whom.
//
//   It shows member contributions only. Donations live in their own section
//   (Admin Panel -> Donations), and loan money in its own (Admin Panel -> Loans).
//   The three are never mixed.
//
// THE CARDS AT THE TOP
//   Worked out by lib/fund/collection.ts from the real rows. Only APPROVED
//   payments count as collected; money waiting to be verified is shown on its
//   own card so a promise is never mistaken for cash.
//
// THE TABLE BELOW
//   Every payment with search and a status filter (search looks in the
//   transaction id, reference, bank, purpose and description - plus the member's
//   name and email). Paging keeps it fast even with years of records.
//
// WHAT YOU CANNOT DO HERE
//   Approve or reject. Money decisions go through
//   /admin/fund/pending and POST /api/admin/fund/decisions, so the permission
//   rules and the audit trail can never be skipped.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { FieldConfig, ColumnConfig } from '@/components/admin/types';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { PAYMENT_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@/lib/constants';
import { formatMoney, monthLabel, monthStart, addMonths } from '@/lib/fund/calc';
import { getCollectionOverview } from '@/lib/fund/collection';
import { readSettingValue } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.fundCollections'), robots: { index: false, follow: false } };
}

/** The member dropdown and the bank dropdown are loaded from the database. */
async function getOptions() {
  if (!isDatabaseConfigured()) return { members: [], banks: [], categories: [] };

  const [members, banks, categories] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
      take: 500,
    }),
    prisma.bank.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
    prisma.fundCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);

  return {
    members: members.map((member) => ({
      value: member.id,
      label: `${member.name} (${member.email})`,
    })),
    banks: banks.map((bank) => ({ value: bank.id, label: bank.name })),
    categories: categories.map((category) => ({ value: category.id, label: category.name })),
  };
}

/** Turn "2026-10" into a Date, falling back to this month. */
function parseMonth(value: string | undefined): Date {
  if (!value) return monthStart(new Date());
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return monthStart(new Date());
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return monthStart(new Date());
  return monthStart(new Date(Number(match[1]), month, 1));
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

export default async function AdminCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = parseMonth(params.month);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

  const monthlyAmountText = await readSettingValue('fund.monthlyAmount', '20');
  const monthlyAmount = Number(monthlyAmountText) || 20;

  // ---------- The cards ----------
  const [options, overview, approvedExpenses] = await Promise.all([
    getOptions(),
    getCollectionOverview(month, monthlyAmount),
    isDatabaseConfigured()
      ? prisma.expense.aggregate({
          _sum: { amount: true },
          where: { isDeleted: false, status: 'APPROVED' },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
  ]);

  // The balance is approved contributions minus approved expenses. Loans are NOT
  // part of it - they have their own screens.
  const balance = overview.collectedOverall - (approvedExpenses._sum.amount ?? 0);

  const previousKey = `${addMonths(month, -1).getFullYear()}-${String(addMonths(month, -1).getMonth() + 1).padStart(2, '0')}`;
  const nextKey = `${addMonths(month, 1).getFullYear()}-${String(addMonths(month, 1).getMonth() + 1).padStart(2, '0')}`;

  const FIELDS: FieldConfig[] = [
    {
      name: 'memberId',
      label: 'Member',
      type: 'select',
      required: true,
      span: 1,
      options: options.members,
      hint: 'Who paid this money.',
    },
    { name: 'amount', label: 'Amount (whole rupees)', type: 'number', required: true, span: 1 },
    { name: 'paymentDate', label: 'Payment date', type: 'date', required: true, span: 1 },
    {
      name: 'method',
      label: 'Payment method',
      type: 'select',
      span: 1,
      options: PAYMENT_METHOD_OPTIONS,
    },
    {
      name: 'bankId',
      label: 'Bank / wallet',
      type: 'select',
      span: 1,
      options: options.banks,
      hint: 'Leave empty for cash or cheque.',
    },
    {
      name: 'bankNameSnapshot',
      label: 'Bank name (kept on the record)',
      type: 'text',
      span: 1,
      hint: 'Filled in automatically from the member form. Only change it if the bank is not in the list.',
    },
    {
      name: 'transactionId',
      label: 'Transaction ID',
      type: 'text',
      required: true,
      span: 1,
      hint: 'Each transaction ID can only be recorded once.',
    },
    { name: 'referenceNumber', label: 'Reference number', type: 'text', span: 1 },
    {
      name: 'periodMonth',
      label: 'Month this payment is for',
      type: 'date',
      span: 1,
      hint: 'Use the first day of the month, for example 2026-10-01 for October 2026. Leave empty for a one-off donation.',
    },
    {
      name: 'fundCategoryId',
      label: 'Fund category',
      type: 'select',
      span: 1,
      options: options.categories,
    },
    { name: 'purpose', label: 'Purpose', type: 'text', span: 2 },
    { name: 'description', label: 'Description / note', type: 'textarea', span: 2 },
    {
      name: 'receiptUrl',
      label: 'Receipt / screenshot',
      type: 'image',
      span: 2,
      uploadable: true,
    },
  ];

  // ========================================
  // THE COLUMNS (member fund records)
  // ========================================
  const COLUMNS: ColumnConfig[] = [
    { name: 'memberName', label: 'Member' },
    { name: 'memberCode', label: 'Member ID', hideOnMobile: true },
    { name: 'memberEmail', label: 'Email', hideOnMobile: true },
    { name: 'periodMonth', label: 'Month', type: 'date' },
    { name: 'amount', label: 'Fund amount', type: 'money' },
    { name: 'paymentDate', label: 'Paid on', type: 'date' },
    { name: 'method', label: 'Method', hideOnMobile: true },
    { name: 'status', label: 'Status', type: 'badge' },
    { name: 'reviewedBy.name', label: 'Verified by', hideOnMobile: true },
    { name: 'reviewedAt', label: 'Verified on', type: 'date', hideOnMobile: true },
    { name: 'reviewNote', label: 'Remarks', type: 'longtext', hideOnMobile: true },
  ];

  return (
    <div className="space-y-8">
      {/* ========================================
          HEADER + MONTH PICKER
          ======================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Fund management"
          icon="banknote"
          title="Monthly fund records"
          description="Member fund money only. Donations and loans have their own screens and are never mixed into these figures."
        />

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/fund/collections?month=${previousKey}`} className="btn btn-outline btn-sm">
            <Icon name="chevron-left" className="h-4 w-4" />
            Previous
          </Link>
          <span className="rounded-btn bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
            {monthLabel(month)}
          </span>
          <Link href={`/admin/fund/collections?month=${nextKey}`} className="btn btn-outline btn-sm">
            Next
            <Icon name="chevron-right" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ========================================
          THE NINE CARDS
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          label="Total fund collected"
          value={formatMoney(overview.collectedOverall)}
          icon="banknote"
          tone="good"
          hint={`${overview.approvedPaymentsOverall} approved payment(s), all time`}
        />
        <Card
          label={`This month (${monthLabel(month)})`}
          value={formatMoney(overview.collectedThisMonth)}
          icon="chart"
          tone="good"
        />
        <Card
          label={`Previous month (${overview.previousMonthLabel})`}
          value={formatMoney(overview.collectedPreviousMonth)}
          icon="calendar"
        />
        <Card
          label="Pending fund"
          value={formatMoney(overview.pendingThisMonth)}
          icon="clock"
          tone={overview.pendingThisMonth > 0 ? 'warn' : 'default'}
          hint="Submitted, waiting to be verified - NOT counted as collected"
        />
        <Card
          label="Paid members"
          value={String(overview.membersPaid + overview.membersPartlyPaid)}
          icon="check-circle"
          hint={`${overview.membersPaid} paid in full, ${overview.membersPartlyPaid} part paid`}
        />
        <Card
          label="Unpaid members"
          value={String(overview.membersNotPaid)}
          icon="users"
          tone={overview.membersNotPaid > 0 ? 'warn' : 'good'}
        />
        <Card
          label="Expected monthly fund"
          value={formatMoney(overview.expectedThisMonth)}
          icon="chart"
          hint={`${overview.activeMembers} active members × ${formatMoney(monthlyAmount)}`}
        />
        <Card
          label="Remaining expected fund"
          value={formatMoney(overview.remainingThisMonth)}
          icon="info"
          tone={overview.remainingThisMonth > 0 ? 'warn' : 'good'}
          hint="Expected − collected"
        />
        <Card
          label="Total fund balance"
          value={formatMoney(balance)}
          icon="banknote"
          hint="All approved contributions − all approved expenses (loans are not part of this)"
        />
      </div>

      {/* ========================================
          WHERE TO GO NEXT
          ======================================== */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/fund/accounting" className="btn btn-outline btn-sm">
          <Icon name="chart" className="h-4 w-4" />
          Collection accounting
        </Link>
        <Link href="/admin/fund/contributors" className="btn btn-outline btn-sm">
          <Icon name="users" className="h-4 w-4" />
          Member-wise report
        </Link>
        <Link href={`/admin/fund/contributions?month=${monthKey}`} className="btn btn-outline btn-sm">
          <Icon name="calendar" className="h-4 w-4" />
          Monthly tracking
        </Link>
        <Link href="/admin/fund/pending" className="btn btn-primary btn-sm">
          <Icon name="check-circle" className="h-4 w-4" />
          Verify payments
        </Link>
        <a
          href={`/api/admin/fund/reports?report=collections&from=${monthKey}-01&to=${monthKey}-28&format=csv`}
          className="btn btn-outline btn-sm"
        >
          <Icon name="download" className="h-4 w-4" />
          Download CSV
        </a>
      </div>

      {/* ========================================
          THE RECORDS TABLE
          ======================================== */}
      <div id="fund-records">
        <ResourceManager
          resourceKey="fund-payments"
          entityLabel="Payment"
          title="Fund records"
          description="Every member fund payment in the system. Approving and rejecting happens in Payment verification. Search looks in the transaction id, reference, bank, purpose, description, member name and member email."
          fields={FIELDS}
          columns={COLUMNS}
          statusOptions={PAYMENT_STATUS_OPTIONS}
          publishField="status"
          canEdit
        />
      </div>

      <p className="text-xs text-ink-500">
        Looking for one member across every month? Use the{' '}
        <Link href="/admin/fund/contributors" className="font-semibold text-brand-700 hover:underline">
          member-wise report
        </Link>
        . Dates and methods can also be narrowed down in the CSV downloads, which open in Excel.
      </p>
    </div>
  );
}
