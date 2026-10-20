import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// SUPER ADMIN - MEMBER-WISE CONTRIBUTION REPORT
// ========================================
// Address: /admin/fund/contributors?month=2026-10&search=&status=&district=
//
// WHAT THIS SCREEN ANSWERS
//   "Who paid, who has not, and how much is missing?" - one row per member for
//   the month you choose:
//
//     Member | Member ID | District | Month | Expected | Paid | Due | Status | Paid on
//
// THE SEARCH BOX LOOKS IN
//   name, email, phone, membership number and district, so the office can find a
//   person the way they think about them ("Kaski", "MEM-014", or a phone
//   number).
//
// WHERE THE NUMBERS COME FROM
//   lib/fund/collection.ts. "Paid" only ever counts APPROVED payments, and the
//   amount waiting to be verified is shown on its own so it can never be
//   mistaken for money in the bank.
//
// DOWNLOADS
//   The same list can be downloaded as CSV, which opens in Excel and Sheets.
//
// WHO MAY OPEN IT
//   requireSuperAdmin() - the organization asked for the contribution reports to
//   be a Super Admin view.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/Section';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { formatMoney, monthLabel, monthStart, addMonths } from '@/lib/fund/calc';
import { countMemberContributionRows, getMemberContributionRows } from '@/lib/fund/collection';
import { DISTRICT_OPTIONS } from '@/config/districts';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.fundContributors'), robots: { index: false, follow: false } };
}

// The five states a month's contribution can be in (see prisma/schema.prisma ->
// MonthlyContribution).
const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'PAID', label: 'Paid in full' },
  { value: 'PARTIAL', label: 'Part paid' },
  { value: 'PENDING', label: 'Not paid yet' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'WAIVED', label: 'Waived (excused)' },
];

/** The colours of the status badge, written out in full for the styling tool. */
const STATUS_CLASSES: Record<string, string> = {
  PAID: 'bg-green-50 text-green-700 ring-green-200',
  PARTIAL: 'bg-amber-50 text-amber-700 ring-amber-200',
  PENDING: 'bg-ink-100 text-ink-600 ring-ink-200',
  OVERDUE: 'bg-red-50 text-red-700 ring-red-200',
  WAIVED: 'bg-blue-50 text-blue-700 ring-blue-200',
};

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Paid',
  PARTIAL: 'Part paid',
  PENDING: 'Not paid',
  OVERDUE: 'Overdue',
  WAIVED: 'Waived',
};

const PAGE_SIZE = 50;

function parseMonth(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return monthStart(new Date(Number(match[1]), month, 1));
}

export default async function MemberContributorsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; search?: string; status?: string; district?: string; page?: string }>;
}) {
  await requireSuperAdmin();

  const params = await searchParams;

  // No month given -> this month (the month the office is working in).
  const month = parseMonth(params.month) ?? monthStart(new Date());
  const search = (params.search ?? '').trim();
  const status = (params.status ?? '').trim();
  const district = (params.district ?? '').trim();
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const filters = {
    periodMonth: month,
    search,
    status,
    district,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  };

  const [rows, total] = await Promise.all([
    getMemberContributionRows(filters),
    countMemberContributionRows(filters),
  ]);

  // ---------- Totals for the rows on this page ----------
  const expectedShown = rows.reduce((sum, row) => sum + row.requiredAmount, 0);
  const paidShown = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const dueShown = rows.reduce((sum, row) => sum + row.dueAmount, 0);
  const pendingShown = rows.reduce((sum, row) => sum + row.pendingAmount, 0);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---------- Links keep the chosen filters ----------
  const query = new URLSearchParams();
  query.set('month', `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`);
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  if (district) query.set('district', district);
  const queryString = query.toString();

  const csvFrom = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`;
  const csvTo = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-28`;
  const csvHref = `/api/admin/fund/reports?report=member-contributions&from=${csvFrom}&to=${csvTo}&format=csv`;

  return (
    <div className="space-y-8">
      {/* ========================================
          HEADER
          ======================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Super Admin"
          icon="users"
          title="Member contribution report"
          description="One row per member for the month you choose. Only approved payments count as paid."
        />

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/fund/accounting" className="btn btn-outline btn-sm">
            <Icon name="chart" className="h-4 w-4" />
            Accounting overview
          </Link>
          <a href={csvHref} className="btn btn-primary btn-sm">
            <Icon name="download" className="h-4 w-4" />
            Download CSV
          </a>
        </div>
      </div>

      {/* ========================================
          FILTERS
          ======================================== */}
      <form method="get" className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">
              Search (name, email, member ID, district)
            </span>
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="For example: Kaski, or MEM-014"
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Month</span>
            <input
              type="month"
              name="month"
              defaultValue={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`}
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Status</span>
            <select name="status" defaultValue={status} className="input">
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">District</span>
            <select name="district" defaultValue={district} className="input">
              <option value="">Any district</option>
              {DISTRICT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary btn-sm">
            <Icon name="search" className="h-4 w-4" />
            Show this report
          </button>
          <Link href="/admin/fund/contributors" className="btn btn-outline btn-sm">
            Clear filters
          </Link>
          <span className="text-sm text-ink-500">
            Showing {monthLabel(month)} · {total} row{total === 1 ? '' : 's'}
          </span>
        </div>
      </form>

      {/* ========================================
          TOTALS FOR WHAT IS SHOWN
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Expected (these rows)
          </p>
          <p className="mt-2 font-display text-xl font-bold text-ink-900">
            {formatMoney(expectedShown)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Paid (approved)
          </p>
          <p className="mt-2 font-display text-xl font-bold text-green-700">{formatMoney(paidShown)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Still due</p>
          <p className="mt-2 font-display text-xl font-bold text-amber-700">{formatMoney(dueShown)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Waiting for verification
          </p>
          <p className="mt-2 font-display text-xl font-bold text-ink-900">
            {formatMoney(pendingShown)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Not counted as paid</p>
        </div>
      </div>

      {/* ========================================
          THE TABLE
          ======================================== */}
      {rows.length === 0 ? (
        <EmptyState
          icon="users"
          title="No members match this report"
          description="Try another month, clear the search box, or check that the month has been opened on the Monthly tracking screen. Members are created in Admin Panel → Members."
        />
      ) : (
        <div className="card overflow-hidden">
          {/* On a phone the table scrolls sideways instead of squashing. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Member ID</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid on</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.memberId}-${row.monthKey}`}
                    className="border-t border-ink-100 align-top"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink-900">{row.memberName}</span>
                      <span className="block text-xs text-ink-500">{row.email}</span>
                      {row.phone ? <span className="block text-xs text-ink-500">{row.phone}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{row.memberCode ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-600">{row.district ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-600">{row.monthLabel}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {formatMoney(row.requiredAmount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-green-700">
                      {formatMoney(row.paidAmount)}
                      {row.pendingAmount > 0 ? (
                        <span className="block text-xs font-normal text-amber-700">
                          +{formatMoney(row.pendingAmount)} pending
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium">
                      {row.dueAmount > 0 ? formatMoney(row.dueAmount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                          STATUS_CLASSES[row.status] ?? 'bg-ink-100 text-ink-600 ring-ink-200'
                        }`}
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                      {row.lastPaymentDate ? formatDate(row.lastPaymentDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- Paging ---------- */}
          {lastPage > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3">
              <span className="text-sm text-ink-500">
                Page {page} of {lastPage}
              </span>

              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`/admin/fund/contributors?${queryString}&page=${page - 1}`}
                    className="btn btn-outline btn-sm"
                  >
                    <Icon name="chevron-left" className="h-4 w-4" />
                    Previous
                  </Link>
                ) : null}

                {page < lastPage ? (
                  <Link
                    href={`/admin/fund/contributors?${queryString}&page=${page + 1}`}
                    className="btn btn-outline btn-sm"
                  >
                    Next
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================
          A NOTE ABOUT WHAT "PAID" MEANS HERE
          ======================================== */}
      <section className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">How to read this report</h3>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li className="flex gap-2">
            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>Paid</strong> counts approved payments only. Money that the office has not
              verified yet is shown next to it as “pending”.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>Due</strong> is expected − paid, so a member who paid part of the month shows
              the remaining amount.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              A month is opened automatically the first time a member (or the office) opens the fund
              screens, so a new month may need one visit before it appears here.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="briefcase" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              Loans are not part of this report. Loan money is completely separate and lives on{' '}
              <Link href="/admin/loans" className="font-semibold text-brand-700 hover:underline">
                the loan screens
              </Link>
              .
            </span>
          </li>
        </ul>

        <p className="mt-4 text-xs text-ink-500">
          Looking for a different month? Use the month box above, or the arrows on the accounting
          overview. Previous months are never deleted.
        </p>
      </section>
    </div>
  );
}
