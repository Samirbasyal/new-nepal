import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
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
//
// ========================================
// WHAT CHANGED ON THIS SCREEN (and why)
// ========================================
// 1. THE RECEIPT CAN BE READ WITHOUT LEAVING THE QUEUE
//    It used to be a plain link, which opened a new tab at an unhelpful size,
//    so the administrator lost their place in the queue every time they checked
//    a receipt. It is now the ReceiptViewer panel, which opens over the page
//    with zoom in, zoom out and Escape to close. (ReceiptViewer.tsx already
//    existed but was not used anywhere on this screen.)
//
// 2. THE 15th IS NOW VISIBLE
//    The club's due date is the 15th of the month the payment is for. A payment
//    that is still waiting after that date is flagged, and can be filtered, so
//    a late one cannot quietly sit at the bottom of a long list.
//
// 3. THE QUEUE CAN BE NARROWED DOWN
//    Search by member, phone, transaction ID or reference, and filter by bank,
//    by month, or by "late only". The form is an ordinary GET form, so the
//    filters live in the address bar - a filtered view can be bookmarked, and
//    the browser's Back button behaves normally.
//
// 4. A SECOND CLICK BEFORE MONEY MOVES
//    Approving is the only click here that changes the organization's totals,
//    so DecisionPanel now asks "Approve the payment of Rs ...?" first.
//
// NOTE ON FILTERING
//   The waiting queue is small (payments waiting for verification, never the
//   whole history), so the list is fetched once - exactly as before - and the
//   filters are applied in memory. That keeps the database query identical and
//   avoids a case-sensitivity difference between the local SQLite database and
//   production PostgreSQL.
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
import { ReceiptViewer } from '@/components/admin/ReceiptViewer';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.fundPending'), robots: { index: false, follow: false } };
}

// ---------- Small helpers (kept out of the component body) ----------

type SearchParams = Record<string, string | string[] | undefined>;

/** A GET form can repeat a name; only the first value matters here. */
function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** "2026-10" - used to compare a payment's month with the month filter. */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * The club's due date: the 15th of the month the payment is for, at the end of
 * that day. Returns null when the payment is not tied to a month.
 */
function dueDateFor(periodMonth: Date | null): Date | null {
  if (!periodMonth) return null;
  return new Date(periodMonth.getFullYear(), periodMonth.getMonth(), 15, 23, 59, 59, 999);
}

export default async function AdminPendingPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireAdmin();

  if (!isDatabaseConfigured()) {
    return <EmptyState icon="alert" title="The database is not set up yet" description="" />;
  }

  const params = await searchParams;
  const query = single(params.q).trim().toLowerCase();
  const bankFilter = single(params.bank);
  const monthFilter = single(params.month);
  const lateOnly = single(params.overdue) === '1';
  const isFiltered = Boolean(query || bankFilter || monthFilter || lateOnly);

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

  // ---------- Work out the due date and how long each one has waited ----------
  const now = Date.now();

  const rows = pending.map((payment) => {
    const dueOn = dueDateFor(payment.periodMonth);
    const submittedAt = new Date(payment.submittedAt).getTime();
    return {
      payment,
      dueOn,
      late: Boolean(dueOn && now > dueOn.getTime()),
      waitingDays: Math.max(0, Math.floor((now - submittedAt) / 86_400_000)),
    };
  });

  // ---------- The filter choices come from the queue itself, so the lists are
  // never empty and can never offer a bank or month with nothing in it. ----------
  const bankOptions: { id: string; name: string }[] = [];
  for (const payment of pending) {
    const bank = payment.bank;
    if (bank && !bankOptions.some((option) => option.id === bank.id)) {
      bankOptions.push({ id: bank.id, name: bank.name });
    }
  }

  const monthOptions: { key: string; label: string }[] = [];
  for (const payment of pending) {
    const month = payment.periodMonth;
    if (!month) continue;
    const key = monthKey(month);
    if (!monthOptions.some((option) => option.key === key)) {
      monthOptions.push({ key, label: monthLabel(month) });
    }
  }

  // ---------- Apply the filters in memory ----------
  const visible = rows.filter((row) => {
    const payment = row.payment;

    if (lateOnly && !row.late) return false;
    if (bankFilter && payment.bank?.id !== bankFilter) return false;
    if (monthFilter && (!payment.periodMonth || monthKey(payment.periodMonth) !== monthFilter)) {
      return false;
    }

    if (query) {
      const haystack = [
        payment.member?.name,
        payment.member?.phone,
        payment.member?.email,
        payment.transactionId,
        payment.referenceNumber,
        payment.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  const waitingTotal = rows.reduce((sum, row) => sum + row.payment.amount, 0);
  const visibleTotal = visible.reduce((sum, row) => sum + row.payment.amount, 0);
  const lateCount = rows.filter((row) => row.late).length;

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

      {/* ========================================
          SUMMARY
          ======================================== */}
      <div className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">
          {rows.length} payment(s) waiting · {formatMoney(waitingTotal)}
        </p>
        {lateCount > 0 ? (
          <p className="mt-1 font-semibold text-red-700">
            {lateCount} of them are past the 15th due date.
          </p>
        ) : null}
        <p className="mt-1">
          Please check the transaction ID against the bank statement before approving. Nothing is
          added to the fund balance until you approve it.
        </p>
      </div>

      {/* ========================================
          FILTERS
          An ordinary GET form. Submitting it puts the choices in the address
          bar, so a filtered view can be bookmarked and Back works normally.
          ======================================== */}
      {rows.length > 0 ? (
        <form method="get" className="card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="filter-q">
                Member, phone, transaction ID
              </label>
              <input
                id="filter-q"
                name="q"
                type="search"
                defaultValue={single(params.q)}
                placeholder="Search this queue"
                className="input"
              />
            </div>

            <div>
              <label className="label" htmlFor="filter-bank">
                Bank account
              </label>
              <select id="filter-bank" name="bank" defaultValue={bankFilter} className="input">
                <option value="">All banks</option>
                {bankOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="filter-month">
                Month the payment is for
              </label>
              <select id="filter-month" name="month" defaultValue={monthFilter} className="input">
                <option value="">All months</option>
                {monthOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 pb-2 text-sm text-ink-700" htmlFor="filter-late">
                <input
                  id="filter-late"
                  name="overdue"
                  type="checkbox"
                  value="1"
                  defaultChecked={lateOnly}
                  className="h-4 w-4"
                />
                Late only
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary btn-sm">
              <Icon name="check-circle" className="h-4 w-4" />
              Apply
            </button>
            {isFiltered ? (
              <Link href="/admin/fund/pending" className="btn btn-ghost btn-sm">
                Clear filters
              </Link>
            ) : null}
          </div>

          {isFiltered ? (
            <p className="mt-3 text-xs text-ink-600">
              Showing {visible.length} of {rows.length} waiting payment(s) ·{' '}
              {formatMoney(visibleTotal)}
            </p>
          ) : null}
        </form>
      ) : null}

      {/* ========================================
          THE QUEUE
          ======================================== */}
      {rows.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="Nothing is waiting for verification"
          description="Every submitted payment has been reviewed. New submissions appear here automatically."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="No payment matches these filters"
          description="Try a shorter search, or clear the filters to see the whole queue."
        />
      ) : (
        <ul className="space-y-4">
          {visible.map((row) => {
            const payment = row.payment;

            return (
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
                      Submitted {new Date(payment.submittedAt).toLocaleString('en-GB')}
                      {row.waitingDays > 0
                        ? ` · waiting ${row.waitingDays} day${row.waitingDays === 1 ? '' : 's'}`
                        : ' · waiting since today'}
                    </p>
                  </div>
                  <StatusChip status={payment.status} />
                </div>

                {/* ---------- Past the 15th ---------- */}
                {row.late ? (
                  <p className="mt-3 flex items-start gap-2 rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                    <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Past the 15th due date for {payment.periodMonth ? monthLabel(payment.periodMonth) : 'this month'}.
                    Please verify it or ask the member about it.
                  </p>
                ) : null}

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="Bank" value={payment.bankNameSnapshot ?? payment.bank?.name ?? '-'} />
                  <Detail
                    label="Paid on"
                    value={new Date(payment.paymentDate).toLocaleDateString('en-GB')}
                  />
                  <Detail label="Transaction ID" value={payment.transactionId} mono />
                  <Detail label="Reference" value={payment.referenceNumber ?? '-'} />
                  <Detail
                    label="Month"
                    value={payment.periodMonth ? monthLabel(payment.periodMonth) : '-'}
                  />
                  <Detail
                    label="Due date"
                    value={row.dueOn ? `15 ${row.dueOn.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : '-'}
                  />
                  <Detail label="Category" value={payment.fundCategory?.name ?? '-'} />
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

                {/* ========================================
                    THE RECEIPT
                    Opens in a panel over this page, so the administrator can
                    zoom in on the amount and the transaction ID without losing
                    their place in the queue.
                    ======================================== */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {payment.receiptUrl ? (
                    <ReceiptViewer
                      url={payment.receiptUrl}
                      label={`${formatMoney(payment.amount)} from ${payment.member?.name ?? 'a member'}`}
                    />
                  ) : (
                    <span className="text-xs text-ink-500">No receipt was attached.</span>
                  )}
                </div>

                <div className="mt-4 border-t border-ink-100 pt-4">
                  <DecisionPanel
                    recordId={payment.id}
                    type="payment"
                    recordLabel={`the payment of ${formatMoney(payment.amount)} from ${payment.member?.name ?? 'this member'}`}
                    isSuperAdmin={isSuperAdminRole(admin.role)}
                    // Money leaves this queue only after a second click.
                    confirmApprove
                  />
                </div>
              </li>
            );
          })}
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
