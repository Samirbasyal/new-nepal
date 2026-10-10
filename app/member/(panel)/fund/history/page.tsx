// ========================================
// MEMBER PANEL - MY FUND HISTORY
// ========================================
// Address: /member/fund/history
//
// Shows EVERY payment this member has ever submitted, with the reason when a
// payment was rejected or cancelled.
//
// PRIVACY
//   The query filters on the signed-in member's own id, so no other member's
//   financial information can ever appear on this page.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth/guards';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { formatMoney, monthLabel } from '@/lib/fund/calc';
import { SectionHeading } from '@/components/ui/Section';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusChip } from '@/components/admin/FundCharts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My fund history',
  robots: { index: false, follow: false },
};

export default async function MemberFundHistoryPage() {
  const user = await requireMember();

  if (!isDatabaseConfigured()) {
    return <EmptyState icon="alert" title="The database is not set up yet" description="" />;
  }

  const payments = await prisma.fundPayment.findMany({
    where: { memberId: user.id, isDeleted: false },
    orderBy: { submittedAt: 'desc' },
    include: { bank: { select: { name: true } }, fundCategory: { select: { name: true } } },
  });

  const approved = payments.filter((payment) => payment.status === 'APPROVED');
  const totalApproved = approved.reduce((sum, payment) => sum + payment.amount, 0);
  const pending = payments.filter((payment) => payment.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          eyebrow="Monthly fund"
          title="My fund history"
          description="Every payment you have submitted, and what happened to it."
        />
        <Link href="/member/fund" className="btn btn-outline btn-sm">
          <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
          Back to my fund
        </Link>
      </div>

      {/* ========================================
          SUMMARY
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm font-medium text-ink-600">Total approved</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">
            {formatMoney(totalApproved)}
          </p>
          <p className="mt-1 text-xs text-ink-500">{approved.length} payment(s)</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-ink-600">Waiting for verification</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">{pending.length}</p>
          <p className="mt-1 text-xs text-ink-500">
            {formatMoney(pending.reduce((sum, payment) => sum + payment.amount, 0))}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-ink-600">All submissions</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">{payments.length}</p>
          <p className="mt-1 text-xs text-ink-500">Including rejected and cancelled</p>
        </div>
      </div>

      {/* ========================================
          THE LIST
          ======================================== */}
      {payments.length === 0 ? (
        <EmptyState
          icon="banknote"
          title="You have not submitted a payment yet"
          description="Use the Pay monthly fund button to record your first contribution."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Paid on</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Transaction ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="align-top">
                    <td className="px-4 py-3 text-ink-700">
                      {payment.paymentDate.toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {payment.periodMonth ? monthLabel(payment.periodMonth) : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {payment.bankNameSnapshot ?? payment.bank?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">
                      {payment.transactionId}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={payment.status} />
                      {/* A rejected or cancelled payment always explains itself. */}
                      {payment.reviewNote ? (
                        <p className="mt-1 max-w-xs text-xs text-ink-500">{payment.reviewNote}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {payment.receiptUrl ? (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                        >
                          <Icon name="external-link" className="h-3.5 w-3.5" />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
