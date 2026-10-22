// ========================================
// ADMIN PANEL - MEMBER MANAGEMENT
// ========================================
// Address: /admin/member-management
//
// WHAT THIS PAGE IS
//   The office's working list of every member: who they are, the post they hold,
//   the area they look after, how many permanent duties they carry, how this
//   month's tasks are going, and the score and rank they were given.
//
// HOW IT DIFFERS FROM /admin/members
//   /admin/members is about ACCOUNTS - creating one, setting a password, sending
//   the verification email, choosing a role. This page is about the WORK: duties,
//   monthly tasks and performance. Both write to the same database and the same
//   account; neither is a copy of the other.
//
// WHO MAY OPEN IT
//   Administrators only. The panel layout already calls requireAdmin(), and this
//   page asks again on purpose: a page should never rely on being reached through
//   the right door.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { isDatabaseConfigured } from '@/lib/prisma';
import { listMemberManagement } from '@/lib/members/service';
import { MemberManagement } from '@/components/admin/MemberManagement';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member management',
  robots: { index: false, follow: false },
};

type Search = {
  q?: string;
  position?: string;
  area?: string;
  status?: string;
  sort?: string;
  page?: string;
};

export default async function MemberManagementPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdmin();

  if (!isDatabaseConfigured()) {
    return <Alert tone="error">The database is not configured.</Alert>;
  }

  const params = await searchParams;
  const filters = {
    q: (params.q ?? '').trim(),
    position: (params.position ?? '').trim(),
    area: (params.area ?? '').trim(),
    status: (params.status ?? '').trim(),
    sort: (params.sort ?? 'name').trim(),
  };
  const page = Number.parseInt(params.page ?? '1', 10);

  const data = await listMemberManagement({
    ...filters,
    page: Number.isFinite(page) ? page : 1,
    pageSize: 20,
  });

  const cards = [
    { label: 'Registered members', value: data.stats.totalMembers, icon: 'users' as const, href: undefined },
    { label: 'Active', value: data.stats.activeMembers, icon: 'check-circle' as const, href: undefined },
    { label: 'Inactive', value: data.stats.inactiveMembers, icon: 'lock' as const, href: undefined },
    { label: 'Permanent duties', value: data.stats.responsibilities, icon: 'shield-check' as const, href: undefined },
    { label: 'Tasks this month', value: data.stats.monthTasks, icon: 'list' as const, href: undefined },
    { label: 'Pending tasks', value: data.stats.pendingTasks, icon: 'clock' as const, href: undefined },
    { label: 'Completed tasks', value: data.stats.completedTasks, icon: 'check' as const, href: undefined },
  ];

  return (
    <div className="space-y-6">
      {/* ---------- heading ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Member management</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            Every registered member, their post and working area, their permanent responsibilities,
            this month&apos;s tasks, and their monthly score and rank. Permanent duties never expire;
            monthly tasks belong to one month only.
          </p>
        </div>
        <Link href="/admin/members" className="btn btn-outline btn-sm">
          <Icon name="user-plus" className="h-4 w-4" />
          New member account
        </Link>
      </div>

      {/* ---------- the numbers ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {cards.map((card) => (
          <div key={card.label} className="card p-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-card bg-brand-50 text-brand-700">
              <Icon name={card.icon} className="h-4 w-4" />
            </span>
            <p className="mt-2 text-xl font-bold text-ink-900">{card.value}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* ---------- top performers ---------- */}
      {data.topPerformers.length > 0 ? (
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Top performers this month
          </p>
          <ol className="mt-3 flex flex-wrap gap-3">
            {data.topPerformers.map((person) => (
              <li
                key={`${person.rank}-${person.name}`}
                className="flex items-center gap-2 rounded-btn border border-ink-200 px-3 py-2 text-sm"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                  {person.rank}
                </span>
                <span className="font-medium text-ink-900">{person.name}</span>
                {person.overall !== null ? (
                  <span className="text-xs text-ink-500">{person.overall.toFixed(1)}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* ---------- the table ---------- */}
      <MemberManagement
        rows={data.rows}
        positions={data.positions}
        filters={filters}
        page={data.page}
        pages={data.pages}
        total={data.total}
        month={data.month}
      />
    </div>
  );
}
