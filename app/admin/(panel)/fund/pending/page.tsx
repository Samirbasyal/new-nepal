// ========================================
// ADMIN PANEL - PAYMENT VERIFICATION QUEUE
// ========================================
// Address: /admin/fund/pending
//
// THE MOST IMPORTANT ADMIN SCREEN OF THE FUND SYSTEM.
//
// It shows every payment that is waiting for verification, with everything the
// administrator needs to decide:
//   member, amount, bank, payment date, transaction ID, receipt, submitted date
//
// Approving a payment:
//   - marks it APPROVED
//   - adds it to the fund collection total
//   - updates the member's monthly status
//   - notifies the member
//   - writes an audit line
// Rejecting asks for a reason, which the member then sees.
//
// All of that happens on the server in lib/fund/service.ts - this page only
// shows the buttons.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { formatMoney, monthLabel } from '@/lib/fund/calc';
import { isSuperAdminRole } from '@/lib/constants';
import { SectionHeading } from '@/components/ui/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusChip } from '@/components/admin/FundCharts';
import { DecisionPanel } from '@/components/admin/DecisionPanel';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payment verification',
  robots: { index: false, follow: false },
};

export default async function AdminPendingPaymentsPage() {
  const admin = await requireAdmin();

  if (!isDatabaseConfigured()) {
    return <EmptyState icon="alert" title="The database is not set up yet" description="" />;
  }

  const pending = await prisma.fundPayment.findMany({
    where: { status: 'PENDING', isDeleted: false },
    // Oldest first: nobody should be kept waiting because their payment was
    // submitted a long time ago.
    orderBy: { submittedAt: 'asc' },
    include: {
      member: { select: { id: true, name: true, email: true, phone: true } },
      bank: { select: { id: true, name: true, accountNumber: true, isActive: true } },
      fundCategory: { select: { name: true } },
    },
  });

  const total = pending.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          eyebrow="Fund management"
          title="Payment verification"
          description="Confirm that the money really arrived in the bank account before approving."
        />
        <Link href="/admin/fund" className="btn btn-outline btn-sm">
          <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
          Back to dashboard
        </Link>
      </div>

      <div className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">
          {pending.length} payment(s) waiting · {formatMoney(total)}
        </p>
        <p className="mt-1">
          Please check the transaction ID against the bank statement before approving. Nothing is
          added to the fund balance until you approve it.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="Nothing is waiting for verification"
          description="Every submitted payment has been reviewed. New submissions appear here automatically."
        />
      ) : (
        <ul className="space-y-4">
          {pending.map((payment) => (
            <li key={payment.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="font-display text-lg font-bold text-ink-900">
                    {formatMoney(payment.amount)}
                  </p>
                  <p className="text-sm text-ink-700">
                    {payment.member?.name ?? 'Unknown member'}
                    {payment.member?.phone ? ` · ${payment.member.phone}` : ''}
                  </p>
                  <p className="text-xs text-ink-500">
                    Submitted {payment.submittedAt.toLocaleString('en-GB')}
                  </p>
                </div>
                <StatusChip status={payment.status} />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Bank" value={payment.bankNameSnapshot ?? payment.bank?.name ?? '—'} />
                <Detail
                  label="Paid on"
                  value={payment.paymentDate.toLocaleDateString('en-GB')}
                />
                <Detail label="Transaction ID" value={payment.transactionId} mono />
                <Detail label="Reference" value={payment.referenceNumber ?? '—'} />
                <Detail
                  label="Month"
                  value={payment.periodMonth ? monthLabel(payment.periodMonth) : '—'}
                />
                <Detail label="Category" value={payment.fundCategory?.name ?? '—'} />
                {payment.description ? (
                  <Detail label="Member note" value={payment.description} />
                ) : null}
              </dl>

              {payment.bank && !payment.bank.isActive ? (
                <p className="mt-3 text-xs text-amber-800">
                  Note: this bank account has since been switched off. The payment itself is still
                  valid.
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {payment.receiptUrl ? (
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    <Icon name="external-link" className="h-4 w-4" />
                    View receipt
                  </a>
                ) : (
                  <span className="text-xs text-ink-500">No receipt was attached.</span>
                )}
              </div>

              <div className="mt-4 border-t border-ink-100 pt-4">
                <DecisionPanel
                  recordId={payment.id}
                  type="payment"
                  recordLabel={`the payment of ${formatMoney(payment.amount)}`}
                  isSuperAdmin={isSuperAdminRole(admin.role)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className={`mt-0.5 text-ink-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
