// ========================================
// MEMBER PANEL - MY PERFORMANCE
// ========================================
// Address: /member/performance
//
// WHO SEES WHAT
//   Only the signed-in member's own results. There is no id in the address bar
//   and no way to ask for somebody else's: getMyEvaluations() takes the user id
//   from the SESSION, and only PUBLISHED months are returned. A draft an
//   administrator is still writing is invisible here - by design.
//
// WHAT IS SHOWN
//   - the latest month: overall score, rank, the five parts, the remarks
//   - every earlier month, so a member can see their own progress
//   A member can read these numbers and nothing else; there is no box to type in.
// ========================================

import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
import { requireMember } from '@/lib/auth/guards';
import { isDatabaseConfigured } from '@/lib/prisma';
import { getMyEvaluations } from '@/lib/members/service';
import { SectionHeading } from '@/components/ui/Section';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'member.performance'), robots: { index: false, follow: false } };
}

const PARTS = [
  { key: 'workQuality', label: 'Work quality' },
  { key: 'taskCompletion', label: 'Task completion' },
  { key: 'participation', label: 'Participation' },
  { key: 'responsibility', label: 'Responsibility fulfilment' },
  { key: 'teamwork', label: 'Teamwork' },
] as const;

function monthLabel(month: string): string {
  const [year, value] = month.split('-').map(Number);
  if (!year || !value) return month;
  return new Date(year, value - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

type Row = {
  id: string;
  periodMonth: string;
  workQuality: number | null;
  taskCompletion: number | null;
  participation: number | null;
  responsibility: number | null;
  teamwork: number | null;
  overall: number | null;
  rank: number | null;
  remarks: string | null;
};

export default async function MemberPerformancePage() {
  const user = await requireMember();

  if (!isDatabaseConfigured()) {
    return <Alert tone="warning" title="The database is not set up yet" />;
  }

  const rows = (await getMyEvaluations(user.id)) as Row[];
  const latest = rows[0] ?? null;

  return (
    <div>
      <SectionHeading
        eyebrow="Monthly performance"
        icon="chart"
        title="My performance"
        description="Your score, your rank and the committee's remarks for each month. Published results only - a month still being written stays private until the office publishes it."
      />

      {!latest ? (
        <EmptyState
          icon="chart"
          title="No published result yet"
          description="When the committee evaluates a month, your score and rank will appear here."
        />
      ) : (
        <>
          {/* ---------- the latest month ---------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {monthLabel(latest.periodMonth)}
              </p>
              <p className="mt-1 text-3xl font-bold text-ink-900">
                {latest.overall === null ? '-' : latest.overall.toFixed(1)}
                <span className="ml-1 text-sm font-medium text-ink-400">/ 100</span>
              </p>
              <p className="mt-1 text-xs text-ink-500">Overall score</p>
            </div>

            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Ranking</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-bold text-ink-900">
                <Icon name="award" className="h-6 w-6 text-accent-500" />
                {latest.rank ?? '-'}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Position among the members evaluated for this month
              </p>
            </div>

            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Published
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">Visible to you</p>
              <p className="mt-1 text-xs text-ink-500">
                Only a published month is shown. Nobody can change these numbers from here.
              </p>
            </div>
          </div>

          {/* ---------- the five parts ---------- */}
          <div className="mt-5 card p-5">
            <h2 className="text-base font-bold text-ink-900">
              How the score was made up - {monthLabel(latest.periodMonth)}
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PARTS.map((part) => {
                const value = latest[part.key];
                return (
                  <div
                    key={part.key}
                    className="flex items-center justify-between rounded-btn border border-ink-200 px-3 py-2"
                  >
                    <dt className="text-sm text-ink-700">{part.label}</dt>
                    <dd className="text-sm font-semibold text-ink-900">
                      {value === null || value === undefined ? '-' : value.toFixed(1)}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {latest.remarks ? (
              <div className="mt-4 rounded-btn bg-brand-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Remarks from the committee
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{latest.remarks}</p>
              </div>
            ) : null}
          </div>

          {/* ---------- earlier months ---------- */}
          {rows.length > 1 ? (
            <div className="mt-5 card overflow-hidden">
              <div className="border-b border-ink-200 px-4 py-3">
                <h2 className="text-sm font-bold text-ink-900">Earlier months</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                      <th className="px-4 py-2 font-semibold">Month</th>
                      <th className="px-4 py-2 font-semibold">Score</th>
                      <th className="px-4 py-2 font-semibold">Rank</th>
                      <th className="px-4 py-2 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-ink-100 last:border-0">
                        <td className="px-4 py-2 font-medium text-ink-900">
                          {monthLabel(row.periodMonth)}
                        </td>
                        <td className="px-4 py-2 text-ink-700">
                          {row.overall === null ? '-' : row.overall.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-ink-700">{row.rank ?? '-'}</td>
                        <td className="px-4 py-2 text-xs text-ink-500">{row.remarks ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
