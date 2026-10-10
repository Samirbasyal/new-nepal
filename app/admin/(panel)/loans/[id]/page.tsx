// ========================================
// SUPER ADMIN PANEL - ONE LOAN, COMPLETE RECORD
// ========================================
// Address: /admin/loans/<id>
//
// WHAT THE OFFICE CAN DO ON THIS ONE PAGE
//   - see the whole money story: borrowed, interest, total payable, repaid,
//     still outstanding, and how far along the repayment is
//   - upload, view and download the signed agreement (a PRIVATE file)
//   - move the loan forward: under review, approve, record that the money was
//     handed over, reject, or cancel - each with its own reason where needed
//   - record a repayment (part payments are normal) and see the running balance
//     after every single one
//
// EVERY NUMBER IS RECALCULATED WHEN THE PAGE OPENS
//   recalculateLoan() runs before the page is drawn, so a loan whose deadline
//   has just passed shows as Overdue immediately, and one that has just been
//   paid off shows as Completed - without anybody pressing anything.
//
// WHO MAY OPEN IT
//   requireSuperAdmin(). Somebody who is not a Super Administrator is sent to
//   /unauthorized on the server, before any of this data is read.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AgreementUploader, LoanDecisionPanel, LoanReturnForm } from '@/components/admin/LoanPanels';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { formatMoney } from '@/lib/fund/calc';
import { buildRepaymentHistory, loanFigures } from '@/lib/loan/calc';
import { LOAN_RETURN_METHOD_OPTIONS, LOAN_STATUS_OPTIONS } from '@/lib/loan/schemas';
import { recalculateLoan } from '@/lib/loan/service';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Loan record',
  robots: { index: false, follow: false },
};

// ========================================
// STATUS BADGES
// ========================================
// Written out as complete class names (not built from variables) because the
// styling tool only keeps classes it can actually see in the code.
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

function LoanStatusBadge({ status }: { status: string }) {
  const key = String(status).toUpperCase();
  const label = LOAN_STATUS_OPTIONS.find((option) => option.value === key)?.label ?? key;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        STATUS_CLASSES[key] ?? 'bg-ink-100 text-ink-600 ring-ink-200'
      }`}
    >
      {label}
    </span>
  );
}

/** One small labelled value. */
function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className={`mt-0.5 text-sm text-ink-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();

  const { id } = await params;
  if (!isDatabaseConfigured()) notFound();

  // Bring the status in line with the repayment records first (this also sends
  // the "overdue" and "fully repaid" notifications when they first apply).
  await recalculateLoan(id);

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: { select: { id: true, name: true, email: true, phone: true } },
      returns: { where: { isDeleted: false }, orderBy: { returnDate: 'asc' } },
      approvedBy: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!loan || loan.isDeleted) notFound();

  const figures = loanFigures(loan);
  const history = buildRepaymentHistory(loan);
  const methodLabel = (value: string) =>
    LOAN_RETURN_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;

  return (
    <div className="space-y-8">
      {/* ========================================
          HEADER
          ======================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/loans"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-700"
          >
            <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
            All loans
          </Link>

          <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">
            Loan {loan.loanNo}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <LoanStatusBadge status={loan.status} />
            <span className="text-sm text-ink-600">
              {loan.member?.name}
              {loan.member?.email ? ` · ${loan.member.email}` : ''}
            </span>
          </div>
        </div>

        <div className="text-right text-sm text-ink-500">
          <p>
            Created {formatDate(loan.createdAt)}
            {loan.createdBy?.name ? ` by ${loan.createdBy.name}` : ''}
          </p>
          {loan.approvedBy?.name ? <p>Approved by {loan.approvedBy.name}</p> : null}
        </div>
      </div>

      {/* A rejected loan explains itself, so nobody has to ask. */}
      {loan.rejectionReason ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong className="font-semibold">
            {String(loan.status).toUpperCase() === 'CANCELLED' ? 'Reason for cancelling: ' : 'Reason for rejection: '}
          </strong>
          {loan.rejectionReason}
        </div>
      ) : null}

      {/* ========================================
          THE MONEY
          ======================================== */}
      <section>
        <SectionHeading
          eyebrow="Money"
          icon="banknote"
          title="Loan amount and balance"
          description="Worked out from the loan and repayment records every time this page is opened. Nothing here is stored as a total."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Loan amount</p>
            <p className="mt-2 font-display text-xl font-bold text-ink-900">
              {formatMoney(figures.principal)}
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Interest</p>
            <p className="mt-2 font-display text-xl font-bold text-ink-900">
              {figures.interest > 0 ? formatMoney(figures.interest) : 'None'}
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Total payable
            </p>
            <p className="mt-2 font-display text-xl font-bold text-ink-900">
              {formatMoney(figures.payable)}
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Repaid</p>
            <p className="mt-2 font-display text-xl font-bold text-green-700">
              {formatMoney(figures.returned)}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {figures.returnCount} repayment{figures.returnCount === 1 ? '' : 's'}
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Still outstanding
            </p>
            <p
              className={`mt-2 font-display text-xl font-bold ${
                figures.remaining > 0 ? 'text-amber-700' : 'text-green-700'
              }`}
            >
              {figures.remaining > 0 ? formatMoney(figures.remaining) : 'Fully repaid'}
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Repayment progress
            </p>
            <p className="mt-2 font-display text-xl font-bold text-ink-900">{figures.repaidPercent}%</p>

            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100"
              role="progressbar"
              aria-valuenow={figures.repaidPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="How much of this loan has been repaid"
            >
              <div
                className={`h-full rounded-full ${
                  figures.repaidPercent >= 100 ? 'bg-green-600' : 'bg-brand-600'
                }`}
                style={{ width: `${figures.repaidPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          THE STEPS + THE AGREEMENT
          ======================================== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LoanDecisionPanel loanId={loan.id} status={loan.status} />

        <div className="space-y-6">
          <AgreementUploader loanId={loan.id} currentUrl={loan.agreementUrl} />

          <div className="card p-5">
            <h3 className="font-display text-lg font-bold text-ink-900">Agreement details</h3>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Fact
                label="Signed on paper"
                value={loan.agreementSigned ? 'Yes' : 'Not yet'}
              />
              <Fact label="Agreement number" value={loan.agreementNo ?? '—'} />
              <Fact
                label="Agreement date"
                value={loan.agreementDate ? formatDate(loan.agreementDate) : '—'}
              />
              <Fact label="Agreement status" value={loan.agreementStatus} />
              {loan.supportingUrl ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Extra document
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={loan.supportingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-brand-700 hover:underline"
                    >
                      Open the supporting document
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>

            {loan.agreementNote ? (
              <div className="mt-4 border-t border-ink-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  What the agreement says
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{loan.agreementNote}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ========================================
          REPAYMENTS
          ======================================== */}
      <section id="loan-repayments" className="grid gap-6 lg:grid-cols-2">
        <LoanReturnForm loanId={loan.id} remaining={figures.remaining} />

        <div className="card p-5">
          <h3 className="font-display text-lg font-bold text-ink-900">Repayment history</h3>
          <p className="mt-1 text-sm text-ink-600">
            Each line shows what was still owed after that payment.
          </p>

          {history.length === 0 ? (
            <div className="mt-4">
              <p className="rounded-card bg-ink-50 p-4 text-sm text-ink-600">
                No repayment has been recorded yet.
              </p>
            </div>
          ) : (
            /* On a narrow screen the table scrolls sideways instead of pushing
               the page out of shape. */
            <div className="mt-4 -mx-1 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">How</th>
                    <th className="py-2 text-right">Balance after</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-b border-ink-100 last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(row.returnDate)}</td>
                      <td className="py-2 pr-3 font-medium text-green-700">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="py-2 pr-3 text-ink-600">
                        {methodLabel(row.method)}
                        {row.referenceNumber ? (
                          <span className="block text-xs text-ink-500">{row.referenceNumber}</span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {row.balanceAfter > 0 ? formatMoney(row.balanceAfter) : 'Settled'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* A receipt or deposit slip, if one was linked. */}
          {history.some((row) => row.proofUrl) ? (
            <p className="mt-3 text-xs text-ink-500">
              A proof link is attached to at least one repayment - open the repayment from the API
              or ask for the hard copy at the office.
            </p>
          ) : null}
        </div>
      </section>

      {/* ========================================
          THE REST OF THE RECORD
          ======================================== */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-display text-lg font-bold text-ink-900">Dates and purpose</h3>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact label="Loan number" value={loan.loanNo} mono />
            <Fact
              label="Requested on"
              value={loan.requestedDate ? formatDate(loan.requestedDate) : '—'}
            />
            <Fact
              label="Money given on"
              value={loan.givenDate ? formatDate(loan.givenDate) : '—'}
            />
            <Fact
              label="Paid out on"
              value={loan.disbursedDate ? formatDate(loan.disbursedDate) : '—'}
            />
            <Fact
              label="Repayment deadline"
              value={loan.expectedReturnDate ? formatDate(loan.expectedReturnDate) : 'Not set'}
            />
            <Fact
              label="Instalments agreed"
              value={loan.installments ? String(loan.installments) : '—'}
            />
            <Fact label="Currency" value={loan.currency} />
            <Fact
              label="Approved on"
              value={loan.approvedAt ? formatDate(loan.approvedAt) : '—'}
            />
          </dl>

          {loan.purpose ? (
            <div className="mt-4 border-t border-ink-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Purpose of the loan
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{loan.purpose}</p>
            </div>
          ) : null}

          {loan.notes ? (
            <div className="mt-4 border-t border-ink-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Internal notes
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{loan.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="card p-5">
          <h3 className="font-display text-lg font-bold text-ink-900">The member</h3>

          <dl className="mt-4 space-y-4">
            <Fact label="Name" value={loan.member?.name ?? 'Unknown'} />
            <Fact label="Email" value={loan.member?.email ?? '—'} />
            <Fact label="Phone" value={loan.member?.phone ?? '—'} />
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={`/admin/members?search=${encodeURIComponent(loan.member?.email ?? '')}`} variant="outline" size="sm">
              <Icon name="user" className="h-4 w-4" />
              Open the member record
            </ButtonLink>
            <ButtonLink href="/admin/fund/collections" variant="outline" size="sm">
              <Icon name="banknote" className="h-4 w-4" />
              Fund collections
            </ButtonLink>
          </div>

          <p className="mt-4 text-xs text-ink-500">
            The member can see this loan, and only this loan, in their own member panel. Loan money
            is never added to their monthly fund figures.
          </p>
        </div>
      </section>
    </div>
  );
}
