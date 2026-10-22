// ========================================
// ADMIN PANEL - MONTHLY MEMBER REPORT
// ========================================
// Address: /admin/member-management/report?month=YYYY-MM
//
// WHAT THIS IS FOR
//   One page, one month, every member: how many permanent duties they carry, how
//   many of that month's tasks they finished, the score they were given and the
//   rank that came out of it. It is built to be PRINTED and shown in a committee
//   meeting - no menus, no buttons on paper, just the table.
//
// WHY IT READS THE SAME FUNCTION AS THE MANAGEMENT TABLE
//   So the report and the screen can never disagree. The only difference is that
//   the report asks for a specific month and takes everybody (up to 1000).
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { isDatabaseConfigured } from '@/lib/prisma';
import { listMemberManagement } from '@/lib/members/service';
import { Alert } from '@/components/ui/Alert';
import { PrintButton } from '@/components/admin/PrintButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Monthly member report',
  robots: { index: false, follow: false },
};

function monthLabel(month: string): string {
  const [year, value] = month.split('-').map(Number);
  if (!year || !value) return month;
  return new Date(year, value - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function shiftMonth(month: string, delta: number): string {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(year, value - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();

  if (!isDatabaseConfigured()) {
    return <Alert tone="error">The database is not configured.</Alert>;
  }

  const params = await searchParams;
  const requested = params.month ?? '';
  const month = /^\d{4}-\d{2}$/.test(requested)
    ? requested
    : new Date().toISOString().slice(0, 7);

  const data = await listMemberManagement({ month, sort: 'rank', pageSize: 1000, page: 1 });
  const evaluated = data.rows.filter((row) => row.score !== null);
  const average =
    evaluated.length > 0
      ? evaluated.reduce((sum, row) => sum + (row.score ?? 0), 0) / evaluated.length
      : null;

  return (
    <div className="space-y-5">
      {/* ---------- screen-only controls ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link
            href="/admin/member-management"
            className="text-sm font-medium text-ink-600 hover:text-brand-700"
          >
            &larr; Back to member management
          </Link>
          <h1 className="mt-1 text-xl font-bold text-ink-900">Monthly member report</h1>
          <p className="text-sm text-ink-600">
            {monthLabel(month)} · {data.total} members ·{' '}
            {average === null ? 'no scores yet' : `average score ${average.toFixed(1)}`}
          </p>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600" htmlFor="report-month">
              Month
            </label>
            <input id="report-month" type="month" name="month" defaultValue={month} className="input" />
          </div>
          <button type="submit" className="btn btn-outline btn-sm">
            Show
          </button>
          <PrintButton />
        </form>
      </div>

      {/* ---------- the sheet ---------- */}
      <section className="card p-6 print:border-0 print:p-0 print:shadow-none">
        <header className="mb-4 border-b border-ink-200 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
            Janakalyan Samataa Yuwa Club
          </p>
          <h2 className="text-lg font-bold text-ink-900">Member performance - {monthLabel(month)}</h2>
          <p className="mt-1 text-xs text-ink-500">
            Duties are permanent and carry no deadline. Tasks belong to this month only.
          </p>
        </header>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-300 text-left text-[11px] uppercase tracking-wide text-ink-500">
              <th className="py-2 pr-2 font-semibold">Rank</th>
              <th className="py-2 pr-2 font-semibold">Member</th>
              <th className="py-2 pr-2 font-semibold">Position</th>
              <th className="py-2 pr-2 font-semibold">Area</th>
              <th className="py-2 pr-2 text-center font-semibold">Duties</th>
              <th className="py-2 pr-2 text-center font-semibold">Tasks done</th>
              <th className="py-2 pr-2 text-right font-semibold">Score</th>
              <th className="py-2 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const totalTasks = row.tasksTodo + row.tasksInProgress + row.tasksDone;
              return (
                <tr key={row.id} className="border-b border-ink-100 last:border-0">
                  <td className="py-2 pr-2 font-semibold text-ink-900">{row.rank ?? '-'}</td>
                  <td className="py-2 pr-2">
                    <span className="font-medium text-ink-900">{row.name}</span>
                    {row.membershipNo ? (
                      <span className="ml-1 text-xs text-ink-400">({row.membershipNo})</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2 text-ink-700">{row.designation ?? '-'}</td>
                  <td className="py-2 pr-2 text-ink-700">{row.workingArea ?? '-'}</td>
                  <td className="py-2 pr-2 text-center text-ink-700">{row.responsibilityCount}</td>
                  <td className="py-2 pr-2 text-center text-ink-700">
                    {totalTasks === 0 ? '-' : `${row.tasksDone}/${totalTasks}`}
                  </td>
                  <td className="py-2 pr-2 text-right font-semibold text-ink-900">
                    {row.score === null ? '-' : row.score.toFixed(1)}
                  </td>
                  <td className="py-2 text-center text-xs text-ink-600">
                    {row.evaluationPublished ? 'published' : row.score === null ? 'not evaluated' : 'draft'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data.rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">No members to report for this month.</p>
        ) : null}

        <footer className="mt-6 border-t border-ink-200 pt-3 text-[11px] text-ink-500">
          Prepared from the club&apos;s member records. Ranks share the same place when scores are
          equal. Printed {new Date().toLocaleDateString('en-GB')}.
        </footer>
      </section>
    </div>
  );
}
