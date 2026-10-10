// ========================================
// ADMIN PANEL - ONE MEMBER'S FINANCIAL HISTORY
// ========================================
// Address: /admin/member-history?memberId=...
//
// WHAT THIS IS
//   Everything the office knows about one member's money, in one place:
//     1. the monthly member fund (what they owe, what they paid, what is still
//        waiting to be verified)
//     2. their loans (borrowed, repaid, still outstanding)
//     3. donations given by somebody with the same email address
//
// THE THREE ARE NEVER ADDED TOGETHER
//   Member fund, loans and donations are three different kinds of money. This
//   page shows them one under the other, with a total for EACH, and never a
//   single figure that mixes them. That is deliberate: a combined "total" would
//   count the same rupees twice (a loan that was repaid is not new income) and
//   would tell the committee nothing true.
//
// WHY DONATIONS ARE "MATCHED BY EMAIL"
//   A donation has a donor's name and email typed by hand; it is not linked to a
//   member account in the database. So the donations shown here are the ones
//   where the donor's email matches this member's email address, and the page
//   says so plainly rather than pretending to be certain.
//
// WHO MAY OPEN IT
//   requireFinanceAccess() - it is money information. (Administrators, Finance
//   Administrators and Super Administrators.)
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { ButtonLink } from '@/components/ui/Button';
import { requireFinanceAccess } from '@/lib/auth/guards';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { formatMoney, monthLabel } from '@/lib/fund/calc';
import { loanFigures, deriveLoanStatus } from '@/lib/loan/calc';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member financial history',
  robots: { index: false, follow: false },
};

/** The colours of a status badge, written out in full for the styling tool. */
const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  APPROVED: 'bg-green-50 text-green-700 ring-green-200',
  VERIFIED: 'bg-green-50 text-green-700 ring-green-200',
  PAID: 'bg-green-50 text-green-700 ring-green-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  CANCELLED: 'bg-ink-100 text-ink-600 ring-ink-200',
  OVERDUE: 'bg-red-50 text-red-700 ring-red-200',
  COMPLETED: 'bg-green-50 text-green-700 ring-green-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 ring-amber-200',
  DISBURSED: 'bg-blue-50 text-blue-700 ring-blue-200',
  ACTIVE: 'bg-blue-50 text-blue-700 ring-blue-200',
  PARTIAL: 'bg-amber-50 text-amber-700 ring-amber-200',
  WAIVED: 'bg-blue-50 text-blue-700 ring-blue-200',
  NOT_PAID: 'bg-ink-100 text-ink-600 ring-ink-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        STATUS_CLASSES[status] ?? 'bg-ink-100 text-ink-600 ring-ink-200'
      }`}
    >
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

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

export default async function MemberHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  await requireFinanceAccess();

  const params = await searchParams;
  const memberId = params.memberId ?? '';

  if (!memberId || !isDatabaseConfigured()) notFound();

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    include: { profile: true },
  });

  if (!member) notFound();

  // ========================================
  // 1. THE MONTHLY FUND
  // ========================================
  const contributions = await prisma.monthlyContribution.findMany({
    where: { memberId },
    orderBy: { periodMonth: 'desc' },
    take: 60,
  });

  const payments = await prisma.fundPayment.findMany({
    where: { memberId, isDeleted: false },
    orderBy: { paymentDate: 'desc' },
    take: 100,
  });

  const approvedPaid = payments
    .filter((payment) => payment.status === 'APPROVED')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingPaid = payments
    .filter((payment) => payment.status === 'PENDING' || payment.status === 'PARTIAL')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const expectedTotal = contributions.reduce((sum, row) => sum + row.requiredAmount, 0);

  // ========================================
  // 2. LOANS
  // ========================================
  const loans = await prisma.loan.findMany({
    where: { memberId, isDeleted: false },
    include: { returns: { where: { isDeleted: false }, orderBy: { returnDate: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  let loanBorrowed = 0;
  let loanRepaid = 0;

  const loanRows = loans.map((loan) => {
    const figures = loanFigures({
      principalAmount: loan.principalAmount,
      interestAmount: loan.interestAmount,
      returns: loan.returns.map((row) => ({ amount: row.amount, isDeleted: row.isDeleted })),
    });

    loanBorrowed += figures.payable;
    loanRepaid += figures.returned;

    return {
      loan,
      figures,
      status: deriveLoanStatus({
        status: loan.status,
        principalAmount: loan.principalAmount,
        interestAmount: loan.interestAmount,
        disbursedDate: loan.disbursedDate,
        givenDate: loan.givenDate,
        expectedReturnDate: loan.expectedReturnDate,
        returns: loan.returns.map((row) => ({ amount: row.amount, isDeleted: row.isDeleted })),
      }),
    };
  });

  // ========================================
  // 3. DONATIONS (matched on the member's email)
  // ========================================
  const donations = await prisma.donation.findMany({
    where: { isDeleted: false, donorEmail: member.email },
    orderBy: { receivedOn: 'desc' },
    take: 60,
  });

  const donationVerified = donations
    .filter((row) => row.status === 'VERIFIED')
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-8">
      {/* ========================================
          WHO THIS IS
          ======================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Member"
          icon="user"
          title={member.name}
          description={`${member.email}${member.phone ? ` · ${member.phone}` : ''}${
            member.profile?.membershipNo ? ` · member number ${member.profile.membershipNo}` : ''
          }${member.profile?.district ? ` · ${member.profile.district}` : ''}`}
        />

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/fund/contributors" variant="outline" size="sm">
            <Icon name="users" className="h-4 w-4" />
            Member-wise report
          </ButtonLink>
          <ButtonLink href="/admin/members" variant="outline" size="sm">
            <Icon name="user" className="h-4 w-4" />
            All members
          </ButtonLink>
        </div>
      </div>

      {/* ========================================
          1. MONTHLY FUND
          ======================================== */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink-900">
          1. Monthly member fund{' '}
          <span className="text-sm font-normal text-ink-500">(Rs. contributions only)</span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card
            label="Expected so far"
            value={formatMoney(expectedTotal)}
            icon="chart"
            hint={`${contributions.length} month(s) opened`}
          />
          <Card
            label="Paid (approved)"
            value={formatMoney(approvedPaid)}
            icon="banknote"
            tone="good"
            hint="Only approved payments are counted"
          />
          <Card
            label="Waiting to be verified"
            value={formatMoney(pendingPaid)}
            icon="clock"
            tone={pendingPaid > 0 ? 'warn' : 'default'}
            hint="Not counted as paid"
          />
          <Card
            label="Still owed"
            value={formatMoney(Math.max(0, expectedTotal - approvedPaid))}
            icon="info"
            tone={expectedTotal - approvedPaid > 0 ? 'warn' : 'good'}
            hint="Expected − approved"
          />
        </div>

        {contributions.length === 0 ? (
          <p className="card p-4 text-sm text-ink-600">
            No month has been opened for this member yet.
          </p>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-ink-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Expected</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Still to pay</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((row) => (
                    <tr key={row.id} className="border-t border-ink-100">
                      <td className="px-4 py-3 whitespace-nowrap text-ink-800">
                        {monthLabel(row.periodMonth)}
                      </td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.requiredAmount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">
                        {formatMoney(row.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(Math.max(0, row.requiredAmount - row.paidAmount))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {payments.length > 0 ? (
          <details className="card p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink-800">
              Every payment this member has submitted ({payments.length})
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-2">
                  <span className="text-ink-700">
                    {formatDate(payment.paymentDate)} · {payment.method.replace(/_/g, ' ').toLowerCase()}
                    {payment.transactionId ? ` · ${payment.transactionId}` : ''}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{formatMoney(payment.amount)}</span>
                    <StatusBadge status={payment.status} />
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {/* ========================================
          2. LOANS
          ======================================== */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink-900">
          2. Loans{' '}
          <span className="text-sm font-normal text-ink-500">
            (money lent to this member, kept separate from the fund)
          </span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card
            label="Total borrowed"
            value={formatMoney(loanBorrowed)}
            icon="banknote"
            hint={`${loans.length} loan(s)`}
          />
          <Card label="Repaid" value={formatMoney(loanRepaid)} icon="check-circle" tone="good" />
          <Card
            label="Still outstanding"
            value={formatMoney(Math.max(0, loanBorrowed - loanRepaid))}
            icon="clock"
            tone={loanBorrowed - loanRepaid > 0 ? 'warn' : 'good'}
          />
          <Card
            label="Repayment progress"
            value={loanBorrowed > 0 ? `${Math.round((loanRepaid / loanBorrowed) * 100)}%` : '—'}
            icon="chart"
          />
        </div>

        {loans.length === 0 ? (
          <p className="card p-4 text-sm text-ink-600">This member has never taken a loan.</p>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-ink-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3">Loan</th>
                    <th className="px-4 py-3">Given</th>
                    <th className="px-4 py-3 text-right">Payable</th>
                    <th className="px-4 py-3 text-right">Repaid</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loanRows.map(({ loan, figures, status }) => (
                    <tr key={loan.id} className="border-t border-ink-100">
                      <td className="px-4 py-3 font-medium text-ink-900">{loan.loanNo}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                        {loan.givenDate ? formatDate(loan.givenDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">{formatMoney(figures.payable)}</td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {formatMoney(figures.returned)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(figures.remaining)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/loans/${loan.id}`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========================================
          3. DONATIONS
          ======================================== */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink-900">
          3. Donations{' '}
          <span className="text-sm font-normal text-ink-500">
            (matched by the email address {member.email})
          </span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            label="Verified donations"
            value={formatMoney(donationVerified)}
            icon="heart"
            tone="good"
            hint="Only verified donations are counted"
          />
          <Card label="Number of donations" value={String(donations.length)} icon="file-text" />
          <Card
            label="Waiting to be checked"
            value={String(donations.filter((row) => row.status === 'PENDING').length)}
            icon="clock"
          />
        </div>

        {donations.length === 0 ? (
          <p className="card p-4 text-sm text-ink-600">
            No donation has been recorded with this email address. A donation is only linked here when
            the donor used the same email, so a donation given under a different name or address will
            not appear - check the{' '}
            <Link href="/admin/donations" className="font-semibold text-brand-700 hover:underline">
              donation records
            </Link>{' '}
            in that case.
          </p>
        ) : (
          <ul className="card divide-y divide-ink-100 p-0">
            {donations.map((donation) => (
              <li key={donation.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="text-ink-700">
                  {formatDate(donation.receivedOn)} · {donation.purpose ?? 'no purpose recorded'}
                  {donation.reference ? ` · ${donation.reference}` : ''}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{formatMoney(donation.amount)}</span>
                  <StatusBadge status={donation.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ========================================
          WHY THERE IS NO SINGLE TOTAL
          ======================================== */}
      <section className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">
          Why fund, loans and donations are not added together
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li className="flex gap-2">
            <Icon name="banknote" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>Member fund</strong> is money this member contributed. It counts towards the
              collection figures once the office approves it.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="briefcase" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>Loans</strong> are money that went OUT to this member and is coming back. Adding
              the amount lent to the amount contributed would count the same rupees twice.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="heart" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>Donations</strong> are gifts from outside the membership. They have their own
              screen and their own totals.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
