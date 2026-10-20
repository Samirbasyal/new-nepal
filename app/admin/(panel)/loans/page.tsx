import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// SUPER ADMIN PANEL - LOAN MANAGEMENT
// ========================================
// Address: /admin/loans
//
// THE TWO HALVES OF THIS PAGE
//   1. TOP   - the loan overview cards, all worked out by lib/loan/calc.ts from
//              the real rows in the database. Nothing here is typed in.
//   2. BELOW - the loan records table, where a loan is added and edited and
//              where each loan number opens its full record (repayments, the
//              agreement, and the approve / reject / disburse buttons).
//
// LOAN MONEY IS SEPARATE ON PURPOSE
//   Nothing on this page is added to the monthly member fund, and the monthly
//   fund is never added here. The two are reported side by side on the master
//   dashboard, never mixed (see lib/loan/calc.ts).
//
// WHO MAY OPEN IT
//   requireSuperAdmin() below. The Admin Panel layout already checks that the
//   person is an administrator; this page checks the stricter rule as well, and
//   the same check is repeated on the server for every API call
//   (app/api/admin/[resource]/route.ts -> readRoles / writeRoles).
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { SectionHeading } from '@/components/ui/Section';
import { Icon, type IconName } from '@/components/ui/Icon';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { formatMoney } from '@/lib/fund/calc';
import { getLoanTotals } from '@/lib/loan/calc';
import { refreshLoanStatuses } from '@/lib/loan/service';
import { LOAN_AGREEMENT_STATUS_OPTIONS, LOAN_STATUS_OPTIONS } from '@/lib/loan/schemas';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.loans'), robots: { index: false, follow: false } };
}

// ========================================
// THE OVERVIEW CARDS
// ========================================
function LoanCard({
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

export default async function AdminLoansPage() {
  // ---------- Authorization (server side) ----------
  await requireSuperAdmin();

  // ---------- Bring the statuses up to date first ----------
  // "Overdue" depends on today's date, and nothing happens at midnight to tell
  // the database about it. This short pass marks the loans whose deadline has
  // passed (and tells the member), so the cards and the table below always agree
  // with the loan records themselves.
  await refreshLoanStatuses();

  const totals = await getLoanTotals();

  // The members a loan can be given to. Only switched-on member accounts.
  const members = isDatabaseConfigured()
    ? await prisma.user.findMany({
        where: { role: 'MEMBER', isActive: true },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { name: 'asc' },
        take: 500,
      })
    : [];

  const memberOptions = members.map((member) => ({
    value: member.id,
    label: member.email ? `${member.name} — ${member.email}` : member.name,
  }));

  // ---------- Columns of the records table ----------
  const COLUMNS: ColumnConfig[] = [
    {
      name: 'loanNo',
      label: 'Loan no.',
      type: 'link',
      hrefTemplate: '/admin/loans/{id}',
    },
    { name: 'member.name', label: 'Member' },
    { name: 'principalAmount', label: 'Loan amount', type: 'money' },
    { name: 'payableAmount', label: 'Total payable', type: 'money', hideOnMobile: true },
    { name: 'returnedAmount', label: 'Repaid', type: 'money' },
    { name: 'remainingAmount', label: 'Outstanding', type: 'money' },
    { name: 'repaidPercent', label: 'Repaid %', type: 'number', hideOnMobile: true },
    { name: 'status', label: 'Status', type: 'badge' },
    { name: 'expectedReturnDate', label: 'Deadline', type: 'date', hideOnMobile: true },
  ];

  // ---------- The form ----------
  const FIELDS: FieldConfig[] = [
    {
      name: 'memberId',
      label: 'Member',
      type: 'select',
      required: true,
      options: memberOptions,
      section: 'Loan',
      hint:
        memberOptions.length === 0
          ? 'There are no member accounts yet. Add a member first (Admin Panel -> Members).'
          : 'Only switched-on member accounts can be chosen.',
    },
    {
      name: 'principalAmount',
      label: 'Loan amount (Rs.)',
      type: 'number',
      required: true,
      section: 'Loan',
      hint: 'Whole rupees. This is the money actually handed over.',
    },
    {
      name: 'interestAmount',
      label: 'Interest (Rs.)',
      type: 'number',
      section: 'Loan',
      hint: 'Leave empty (or 0) if the club does not charge interest.',
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'text',
      section: 'Loan',
      hint: 'NPR unless you have a reason to change it.',
    },
    {
      name: 'requestedDate',
      label: 'Date requested',
      type: 'date',
      section: 'Loan',
    },
    {
      name: 'givenDate',
      label: 'Date the money was given',
      type: 'date',
      section: 'Loan',
      hint: 'Fill this in when the money is actually handed over.',
    },
    {
      name: 'disbursedDate',
      label: 'Date paid out (optional)',
      type: 'date',
      section: 'Loan',
      hint: 'Looking for the step-by-step way? Use the buttons on the loan page instead - they keep the audit trail tidier.',
    },
    {
      name: 'expectedReturnDate',
      label: 'Repayment deadline',
      type: 'date',
      section: 'Loan',
      hint: 'A loan that goes past this date shows as Overdue automatically.',
    },
    {
      name: 'installments',
      label: 'Number of instalments agreed',
      type: 'number',
      section: 'Loan',
    },
    {
      name: 'purpose',
      label: 'Purpose of the loan',
      type: 'textarea',
      section: 'Loan',
      span: 2,
    },

    // ---------- Agreement ----------
    {
      name: 'agreementSigned',
      label: 'The paper agreement has been signed',
      type: 'checkbox',
      section: 'Physical agreement',
      hint: 'This is about the paper. Upload the scan itself from the loan page.',
    },
    {
      name: 'agreementStatus',
      label: 'Agreement status',
      type: 'select',
      options: LOAN_AGREEMENT_STATUS_OPTIONS,
      section: 'Physical agreement',
    },
    { name: 'agreementNo', label: 'Agreement number', type: 'text', section: 'Physical agreement' },
    { name: 'agreementDate', label: 'Agreement date', type: 'date', section: 'Physical agreement' },
    {
      name: 'agreementUrl',
      label: 'Agreement file',
      type: 'text',
      section: 'Physical agreement',
      hint: 'Filled in automatically when you upload a scan from the loan page. The file itself is private.',
    },
    {
      name: 'agreementNote',
      label: 'What the agreement says',
      type: 'textarea',
      section: 'Physical agreement',
      span: 2,
    },
    {
      name: 'supportingUrl',
      label: 'Extra supporting document',
      type: 'text',
      section: 'Physical agreement',
      hint: 'For example a citizenship copy, if the club keeps one.',
    },

    // ---------- Notes ----------
    {
      name: 'notes',
      label: 'Internal notes',
      type: 'textarea',
      section: 'Notes',
      span: 2,
    },
  ];

  return (
    <div className="space-y-8">
      {/* ========================================
          LOAN OVERVIEW
          ======================================== */}
      <section id="loan-overview">
        <SectionHeading
          eyebrow="Super Admin"
          icon="banknote"
          title="Loan management"
          description="Loans given to members, kept completely separate from the monthly member fund. Every figure below is worked out from the loan and repayment records."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <LoanCard
            label="Total loan amount given"
            value={formatMoney(totals.totalPrincipal)}
            hint={`${totals.totalLoans} loan record${totals.totalLoans === 1 ? '' : 's'}`}
            icon="banknote"
          />
          <LoanCard
            label="Total repaid"
            value={formatMoney(totals.totalRepaid)}
            hint={`${totals.totalReturns} repayment${totals.totalReturns === 1 ? '' : 's'} recorded`}
            icon="check-circle"
            tone="good"
          />
          <LoanCard
            label="Total outstanding"
            value={formatMoney(totals.totalOutstanding)}
            hint={
              totals.totalInterest > 0
                ? `Includes ${formatMoney(totals.totalInterest)} interest`
                : 'Principal only - no interest recorded'
            }
            icon="chart"
            tone={totals.totalOutstanding > 0 ? 'warn' : 'good'}
          />
          <LoanCard
            label="Repaid so far"
            value={`${totals.repaidPercent}%`}
            hint="Of everything ever lent"
            icon="chart"
          />
          <LoanCard
            label="Members who took a loan"
            value={String(totals.borrowingMembers)}
            icon="users"
          />
          <LoanCard
            label="Loans still running"
            value={String(totals.activeLoans + totals.partiallyPaidLoans)}
            hint={`${totals.activeLoans} not started paying, ${totals.partiallyPaidLoans} part paid`}
            icon="briefcase"
          />
          <LoanCard label="Waiting for review" value={String(totals.pendingLoans)} icon="info" />
          <LoanCard label="Approved, not paid out" value={String(totals.approvedLoans)} icon="check-circle" />
          <LoanCard
            label="Overdue"
            value={String(totals.overdueLoans)}
            hint={totals.overdueLoans > 0 ? 'Past the agreed deadline' : 'Nothing is late'}
            icon="calendar"
            tone={totals.overdueLoans > 0 ? 'bad' : 'good'}
          />
          <LoanCard label="Fully repaid" value={String(totals.completedLoans)} icon="check-circle" tone="good" />
          <LoanCard
            label="Rejected / cancelled"
            value={String(totals.rejectedLoans + totals.cancelledLoans)}
            icon="info"
          />
        </div>
      </section>

      {/* ========================================
          LOAN RECORDS
          ======================================== */}
      <section id="loan-records">
        <ResourceManager
          resourceKey="loans"
          entityLabel="Loan"
          title="Loan records"
          description="Click a loan number to open its full record: repayments, the signed agreement and the approve / reject / pay out steps."
          fields={FIELDS}
          columns={COLUMNS}
          statusOptions={LOAN_STATUS_OPTIONS}
          statusField="status"
          defaults={{
            currency: 'NPR',
            interestAmount: 0,
            installments: 0,
            agreementStatus: 'PENDING',
            agreementSigned: false,
          }}
        />
      </section>

      {/* ========================================
          A NOTE ABOUT THE RULES (so nobody is surprised)
          ======================================== */}
      <section className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">How loan money is handled</h3>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li className="flex gap-2">
            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              A loan balance is never typed in and never stored. It is always{' '}
              <strong>loan amount + interest − repayments</strong>, worked out from the records.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              The status changes by itself: <strong>Completed</strong> when the balance reaches
              zero, <strong>Overdue</strong> when the deadline passes.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              Loan money is never added to the monthly member fund, and the fund is never added to
              the loan figures.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              The signed agreement is stored outside the public website. Only a Super Administrator
              can open it.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
