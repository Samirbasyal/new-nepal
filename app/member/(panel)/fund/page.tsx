import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// MEMBER PANEL - MONTHLY FUND
// ========================================
// Address: /member/fund
//
// WHAT THE MEMBER SEES
//   - the amount required for the current month
//   - how much they have already paid towards it
//   - whether the month is paid, partly paid, pending or overdue
//   - their total contribution and their last payment
//   - a quick "Pay monthly fund" button
//
// PRIVACY
//   Every query below filters on the signed-in member's own id. A member can
//   never see another member's money.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth/guards';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import {
  formatMoney,
  monthLabel,
  monthStart,
  contributionDueDate,
  ensureContribution,
  recalculateContribution,
} from '@/lib/fund/calc';
import { readSettingValue } from '@/lib/settings';
import { isAdminRole } from '@/lib/constants';
import { SectionHeading } from '@/components/ui/Section';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/admin/FundCharts';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'member.fund'), robots: { index: false, follow: false } };
}

export default async function MemberFundPage() {
  const user = await requireMember();

  if (!isDatabaseConfigured()) {
    return <EmptyState icon="alert" title="The database is not set up yet" description="" />;
  }

  const thisMonth = monthStart(new Date());
  const yearStart = new Date(thisMonth.getFullYear(), 0, 1);

  const [monthlyAmountText, dueDayText] = await Promise.all([
    // The monthly member fund is Rs. 20 (Admin Panel -> Settings -> Monthly fund).
    readSettingValue('fund.monthlyAmount', '20'),
    // Due on the 15th of the month it belongs to.
    readSettingValue('fund.dueDay', '15'),
  ]);

  const monthlyAmount = Number(monthlyAmountText) || 20;
  const dueDay = Math.min(Math.max(Number(dueDayText) || 15, 1), 28);

  // ---------- Open this month automatically ----------
  // Nobody should have to press a button to make the month appear. The first
  // time the member opens this page in a new month, their Rs. 20 obligation is
  // created for them, and the status is recalculated from their real payments.
  //
  // ADMINISTRATORS ARE SKIPPED. The monthly contribution is an obligation of
  // MEMBERS. An administrator who opens this page just to look around must not
  // end up with their own row in the monthly tracking table. (A leftover row
  // like that was found in the database while testing, which is why this guard
  // is here.)
  if (!isAdminRole(user.role)) {
    await ensureContribution(user.id, thisMonth, monthlyAmount);
    await recalculateContribution(user.id, thisMonth);
  }

  const [
    contribution,
    paidThisMonth,
    totalPaid,
    lastPayment,
    recentPayments,
    pendingCount,
    waitingThisMonth,
  ] = await Promise.all([
      // This member's obligation for the current month (if it exists yet).
      prisma.monthlyContribution.findUnique({
        where: { memberId_periodMonth: { memberId: user.id, periodMonth: thisMonth } },
      }),
      // Approved money towards the current month.
      prisma.fundPayment.aggregate({
        _sum: { amount: true },
        where: {
          memberId: user.id,
          periodMonth: thisMonth,
          status: 'APPROVED',
          isDeleted: false,
        },
      }),
      // Everything this member has ever contributed (approved only).
      prisma.fundPayment.aggregate({
        _sum: { amount: true },
        where: { memberId: user.id, status: 'APPROVED', isDeleted: false },
      }),
      prisma.fundPayment.findFirst({
        where: { memberId: user.id, isDeleted: false },
        orderBy: { paymentDate: 'desc' },
        select: { amount: true, paymentDate: true, status: true, bankNameSnapshot: true },
      }),
      prisma.fundPayment.findMany({
        where: { memberId: user.id, isDeleted: false },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      }),
      prisma.fundPayment.count({
        where: { memberId: user.id, status: 'PENDING', isDeleted: false },
      }),
      // Money the member says they have paid for this month, still waiting for
      // the office to approve it. It is deliberately NOT counted as paid: only
      // an approved payment counts.
      prisma.fundPayment.aggregate({
        _sum: { amount: true },
        where: {
          memberId: user.id,
          periodMonth: thisMonth,
          status: 'PENDING',
          isDeleted: false,
        },
      }),
    ]);

  const paidAmount = paidThisMonth._sum.amount ?? 0;
  const requiredAmount = contribution?.requiredAmount ?? monthlyAmount;
  const remaining = Math.max(0, requiredAmount - paidAmount);

  // Same rule as the server-side calculation, so the member and the office
  // never see different statuses. The contribution for a month is due on the
  // due day of that SAME month (the 15th).
  const dueDate = contributionDueDate(thisMonth, dueDay);

  // Money already submitted for this month but not yet approved by the office.
  const waitingAmount = waitingThisMonth._sum.amount ?? 0;

  const status =
    contribution?.status === 'WAIVED'
      ? 'WAIVED'
      : paidAmount >= requiredAmount
        ? 'PAID'
        : paidAmount > 0
          ? 'PARTIAL'
          : Date.now() > dueDate.getTime()
            ? 'OVERDUE'
            : 'PENDING';

  // Money approved since 1 January of this year.
  const yearPaid = await prisma.fundPayment.aggregate({
    _sum: { amount: true },
    where: {
      memberId: user.id,
      status: 'APPROVED',
      isDeleted: false,
      paymentDate: { gte: yearStart },
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Member panel"
        title="Monthly fund"
        description="Your contribution, your history and your payment button."
      />

      {pendingCount > 0 ? (
        <div className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            {pendingCount} payment(s) are waiting for the office to verify them.
          </p>
          <p className="mt-1">
            They will appear as approved once the office confirms the money arrived.
          </p>
        </div>
      ) : null}

      {/* ========================================
          THIS MONTH
          ======================================== */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink-600">{monthLabel(thisMonth)}</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink-900">
              {formatMoney(requiredAmount)}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Required this month · due by {dueDate.toLocaleDateString('en-GB')}
            </p>
          </div>

          <StatusChip status={status} />
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card bg-ink-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Paid (approved)
            </dt>
            <dd className="mt-1 font-semibold text-ink-900">{formatMoney(paidAmount)}</dd>
          </div>
          <div className="rounded-card bg-ink-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Waiting for approval
            </dt>
            <dd className="mt-1 font-semibold text-ink-900">{formatMoney(waitingAmount)}</dd>
          </div>
          <div className="rounded-card bg-ink-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Still to pay
            </dt>
            <dd className="mt-1 font-semibold text-ink-900">{formatMoney(remaining)}</dd>
          </div>
          <div className="rounded-card bg-ink-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
              This year so far
            </dt>
            <dd className="mt-1 font-semibold text-ink-900">
              {formatMoney(yearPaid._sum.amount ?? 0)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/member/fund/pay" className="btn btn-accent">
            <Icon name="banknote" className="h-4 w-4" />
            Pay monthly fund
          </Link>
          <Link href="/member/fund/history" className="btn btn-outline">
            <Icon name="list" className="h-4 w-4" />
            My fund history
          </Link>
        </div>
      </div>

      {/* ========================================
          SUMMARY
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm font-medium text-ink-600">Total contribution</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">
            {formatMoney(totalPaid._sum.amount ?? 0)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Approved payments only</p>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-ink-600">Last payment</p>
          {lastPayment ? (
            <>
              <p className="mt-2 font-display text-2xl font-bold text-ink-900">
                {formatMoney(lastPayment.amount)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-xs text-ink-500">
                {lastPayment.paymentDate.toLocaleDateString('en-GB')}
                {lastPayment.bankNameSnapshot ? ` · ${lastPayment.bankNameSnapshot}` : ''}
                <StatusChip status={lastPayment.status} />
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-500">You have not submitted a payment yet.</p>
          )}
        </div>
      </div>

      {/* ========================================
          RECENT PAYMENTS
          ======================================== */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-ink-900">Recent payments</h3>
          <Link href="/member/fund/history" className="text-sm font-semibold text-brand-700 hover:underline">
            See everything
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <EmptyState
            icon="banknote"
            title="No payments yet"
            description="When you pay your monthly contribution it will appear here with its status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Bank</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3 pr-4 text-ink-700">
                      {payment.paymentDate.toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 pr-4 text-ink-700">
                      {payment.periodMonth ? monthLabel(payment.periodMonth) : '—'}
                    </td>
                    <td className="py-3 pr-4 font-medium text-ink-900">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="py-3 pr-4 text-ink-700">{payment.bankNameSnapshot ?? '—'}</td>
                    <td className="py-3">
                      <StatusChip status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
