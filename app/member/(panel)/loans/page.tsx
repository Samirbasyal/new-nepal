import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// MEMBER PANEL - MY LOANS
// ========================================
// Address: /member/loans
//
// WHAT A MEMBER SEES HERE
//   Their own loans, one card each, with:
//     - how much was borrowed
//     - how much has been repaid and how much is still outstanding
//     - a progress bar
//     - the repayment deadline
//     - every repayment, with the balance after each one
//
// WHAT A MEMBER CANNOT SEE OR DO
//   - another member's loans (the member id comes from the session, never from
//     the address bar, so there is no way to ask for somebody else's record)
//   - the scanned agreement or the internal notes (those stay with the office)
//   - anything that changes a loan: a member cannot approve a loan, record a
//     repayment or alter a status. This page is read-only by design.
//
// LOAN MONEY IS SEPARATE FROM THE MONTHLY FUND
//   Nothing on this page is added to the member's Rs. 20 monthly contribution,
//   and the contribution is never added here. They are two different things and
//   are shown separately on purpose.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { ButtonLink } from '@/components/ui/Button';
import { requireMember } from '@/lib/auth/guards';
import { formatMoney } from '@/lib/fund/calc';
import { LOAN_STATUS_OPTIONS } from '@/lib/loan/schemas';
import { getMemberLoans } from '@/lib/loan/service';
import { formatDate } from '@/lib/utils';
import { withNepaliDate } from '@/lib/nepali-date';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'member.loans'), robots: { index: false, follow: false } };
}

/** The colours of the status badge, written out in full for the styling tool. */
const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 ring-blue-200',
  APPROVED: 'bg-sky-50 text-sky-700 ring-sky-200',
  DISBURSED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 ring-amber-200',
  OVERDUE: 'bg-red-50 text-red-700 ring-red-200',
  COMPLETED: 'bg-green-50 text-green-700 ring-green-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  CANCELLED: 'bg-ink-100 text-ink-600 ring-ink-200',
};

export default async function MemberLoansPage() {
  const user = await requireMember();

  // The member id comes from the signed-in session - never from the address
  // bar - so a member can only ever load their own loans.
  const { loans } = await getMemberLoans(user.id);

  const outstanding = loans.reduce(
    (total, loan) => total + (loan.displayStatus === 'COMPLETED' ? 0 : loan.figures.remaining),
    0,
  );
  const borrowed = loans
    .filter((loan) => !['REJECTED', 'CANCELLED'].includes(loan.displayStatus))
    .reduce((total, loan) => total + loan.figures.payable, 0);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Member panel"
        icon="banknote"
        title="My loans"
        description="Money borrowed from the organization and what has been repaid so far. This is kept completely separate from your monthly fund."
      />

      {/* ---------- Two simple totals ---------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Currently owing</p>
          <p
            className={`mt-2 font-display text-xl font-bold ${
              outstanding > 0 ? 'text-amber-700' : 'text-green-700'
            }`}
          >
            {formatMoney(outstanding)}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Total borrowed
          </p>
          <p className="mt-2 font-display text-xl font-bold text-ink-900">{formatMoney(borrowed)}</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Loans</p>
          <p className="mt-2 font-display text-xl font-bold text-ink-900">{loans.length}</p>
        </div>
      </div>

      {/* ---------- No loans yet ---------- */}
      {loans.length === 0 ? (
        <EmptyState
          icon="banknote"
          title="You have no loans"
          description="When the organization records a loan for you, it appears here with the repayment history."
        />
      ) : null}

      {/* ---------- One card per loan ---------- */}
      <div className="space-y-6">
        {loans.map((loan) => {
          const key = loan.displayStatus;
          const label = LOAN_STATUS_OPTIONS.find((option) => option.value === key)?.label ?? key;

          return (
            <article key={loan.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink-900">Loan {loan.loanNo}</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    Recorded {withNepaliDate(loan.createdAt)}
                    {loan.purpose ? ` · ${loan.purpose}` : ''}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                    STATUS_CLASSES[key] ?? 'bg-ink-100 text-ink-600 ring-ink-200'
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* ---------- The numbers ---------- */}
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Loan amount
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-900">
                    {formatMoney(loan.figures.principal)}
                    {loan.figures.interest > 0 ? (
                      <span className="block text-xs text-ink-500">
                        + {formatMoney(loan.figures.interest)} interest
                      </span>
                    ) : null}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Repaid
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-green-700">
                    {formatMoney(loan.figures.returned)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Still to repay
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-900">
                    {loan.figures.remaining > 0 ? formatMoney(loan.figures.remaining) : 'Nothing'}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Repayment deadline
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-900">
                    {loan.expectedReturnDate ? withNepaliDate(loan.expectedReturnDate) : 'Not set'}
                  </dd>
                </div>
              </dl>

              {/* ---------- Progress ---------- */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span>Repaid {loan.figures.repaidPercent}%</span>
                  <span>{formatMoney(loan.figures.payable)} in total</span>
                </div>

                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100"
                  role="progressbar"
                  aria-valuenow={loan.figures.repaidPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="How much of this loan has been repaid"
                >
                  <div
                    className={`h-full rounded-full ${
                      loan.figures.repaidPercent >= 100 ? 'bg-green-600' : 'bg-brand-600'
                    }`}
                    style={{ width: `${loan.figures.repaidPercent}%` }}
                  />
                </div>
              </div>

              {/* ---------- Why it was refused (if it was) ---------- */}
              {loan.rejectionReason ? (
                <p className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {loan.rejectionReason}
                </p>
              ) : null}

              {/* ---------- The repayments ---------- */}
              {loan.returns.length > 0 ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[380px] text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 text-right">Balance after</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loan.returns.map((row, index) => (
                        <tr key={row.id} className="border-b border-ink-100 last:border-0">
                          <td className="py-2 pr-3 whitespace-nowrap">{withNepaliDate(row.returnDate)}</td>
                          <td className="py-2 pr-3 font-medium text-green-700">
                            {formatMoney(row.amount)}
                          </td>
                          <td className="py-2 text-right">
                            {loan.figures.payable -
                              loan.returns
                                .slice(0, index + 1)
                                .reduce((total, item) => total + item.amount, 0) >
                            0
                              ? formatMoney(
                                  loan.figures.payable -
                                    loan.returns
                                      .slice(0, index + 1)
                                      .reduce((total, item) => total + item.amount, 0),
                                )
                              : 'Settled'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink-500">
                  No repayment has been recorded yet.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* ---------- Where to pay the monthly fund instead ---------- */}
      <div className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">
          Looking for your monthly fund?
        </h3>
        <p className="mt-2 text-sm text-ink-600">
          The monthly member contribution (Rs. 20) is completely separate from loans. It has its own
          page, its own records and its own receipt.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/member/fund" variant="outline" size="sm">
            <Icon name="banknote" className="h-4 w-4" />
            My monthly fund
          </ButtonLink>
          <ButtonLink href="/member/fund/history" variant="outline" size="sm">
            <Icon name="file-text" className="h-4 w-4" />
            My payment history
          </ButtonLink>
        </div>

        <p className="mt-4 text-xs text-ink-500">
          Need something on this page explained?{' '}
          <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
            Contact the office
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
