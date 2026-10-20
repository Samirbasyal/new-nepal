import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// MEMBER PANEL
// This code controls the Member Dashboard.
// ========================================
// Address: /member/dashboard
//
// WHAT THE MEMBER SEES
//   - a welcome message and their membership status
//   - their profile summary
//   - notices published by the organization
//   - published programs and upcoming events
//   - the tasks assigned to them
//   - quick links to edit their profile
//
// IMPORTANT: every query below is limited to the signed-in member's own
// record (session id) or to PUBLISHED public content. A member can therefore
// never see another member's private information.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth/guards';
import { StatusBadge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { getEvents, getNewsPosts, getPrograms } from '@/lib/data/public';
import { formatDate, formatDateTime, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'member.dashboard'), robots: { index: false, follow: false } };
}

export default async function MemberDashboardPage() {
  // The server guard gives us the signed-in member (and redirects if not signed in).
  const user = await requireMember();

  // ---------- This member's own profile + tasks ----------
  const [profile, tasks, notices, programs, events] = await Promise.all([
    isDatabaseConfigured()
      ? prisma.memberProfile.findUnique({ where: { userId: user.id } }).catch(() => null)
      : Promise.resolve(null),

    // Only tasks assigned to THIS member.
    isDatabaseConfigured()
      ? prisma.task
          .findMany({
            where: { assignedToId: user.id },
            orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
            take: 5,
          })
          .catch(() => [])
      : Promise.resolve([]),

    getNewsPosts({ type: 'NOTICE', pageSize: 3 }),
    getPrograms({ pageSize: 3 }),
    getEvents({ upcomingOnly: true, pageSize: 3 }),
  ]);

  const status = profile?.status ?? 'PENDING';
  const openTasks = tasks.filter((task) => task.status !== 'DONE').length;

  return (
    <div className="space-y-8">
      {/* ========================================
          WELCOME
          ======================================== */}
      <section className="card overflow-hidden">
        <div className="bg-brand-800 px-6 py-8 text-white">
          <p className="text-sm text-brand-100">Welcome back</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{user.name}</h1>
          <p className="mt-2 text-sm text-brand-100">
            This is your member area. Here you can follow what the organization is doing and see
            anything assigned to you.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Membership status
            </p>
            <div className="mt-1.5">
              <StatusBadge status={status} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Member since
            </p>
            <p className="mt-1.5 text-sm text-ink-800">
              {formatDate(profile?.joinedAt ?? profile?.createdAt) || 'Not recorded yet'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Open tasks
            </p>
            <p className="mt-1.5 text-sm text-ink-800">
              {openTasks} {openTasks === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Status explanation ---------- */}
      {status === 'PENDING' ? (
        <Alert tone="info" title="Your membership is pending">
          An administrator will review your account and set your membership status. You can already
          use this panel to follow our programs, events and notices.
        </Alert>
      ) : null}

      {status === 'INACTIVE' || status === 'SUSPENDED' ? (
        <Alert tone="warning" title="Your membership is not active">
          Please contact the organization office if you believe this is a mistake.
        </Alert>
      ) : null}

      {/* ========================================
          MY PROFILE SUMMARY
          ======================================== */}
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Icon name="user" className="h-5 w-5 text-brand-600" />
            My profile
          </h2>
          <ButtonLink href="/member/profile" variant="outline" size="sm">
            Edit profile
          </ButtonLink>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Name</dt>
            <dd className="mt-1 text-sm text-ink-800">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Email</dt>
            <dd className="mt-1 break-all text-sm text-ink-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Designation
            </dt>
            <dd className="mt-1 text-sm text-ink-800">{profile?.designation || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Department
            </dt>
            <dd className="mt-1 text-sm text-ink-800">{profile?.department || 'Not set'}</dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-ink-100 pt-4 text-xs text-ink-500">
          Your email address and membership number can only be changed by an administrator.
        </p>
      </section>

      {/* ========================================
          MY TASKS
          ======================================== */}
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Icon name="check-circle" className="h-5 w-5 text-brand-600" />
            My tasks
          </h2>
          <ButtonLink href="/member/tasks" variant="outline" size="sm">
            View all
          </ButtonLink>
        </div>

        {tasks.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="rounded-card border border-ink-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={task.status} />
                  {task.priority !== 'NORMAL' ? <StatusBadge status={task.priority} /> : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-900">{task.title}</p>
                {task.description ? (
                  <p className="mt-1 text-xs text-ink-600">{truncate(task.description, 140)}</p>
                ) : null}
                {task.dueDate ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-500">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    Due {formatDate(task.dueDate)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon="check-circle"
              title="No tasks assigned to you"
              description="When an administrator gives you a task it will appear here."
              compact
            />
          </div>
        )}
      </section>

      {/* ========================================
          NOTICES / PROGRAMS / EVENTS
          ======================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---------- Notices ---------- */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Icon name="bell" className="h-5 w-5 text-brand-600" />
            Notices
          </h2>

          {notices.rows.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {notices.rows.map((notice) => (
                <li key={notice.id}>
                  <Link
                    href={`/news/${notice.slug}`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {notice.title}
                  </Link>
                  {notice.publishedAt ? (
                    <p className="text-xs text-ink-500">{formatDate(notice.publishedAt)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-500">
              No notices have been published yet.
            </p>
          )}
        </section>

        {/* ---------- Programs ---------- */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Icon name="layers" className="h-5 w-5 text-brand-600" />
            Programs
          </h2>

          {programs.rows.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {programs.rows.map((program) => (
                <li key={program.id}>
                  <Link
                    href={`/programs/${program.slug}`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {program.title}
                  </Link>
                  <p className="text-xs text-ink-500">
                    <StatusBadge status={program.status} />
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-500">No programs published yet.</p>
          )}
        </section>

        {/* ---------- Events ---------- */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Icon name="calendar" className="h-5 w-5 text-brand-600" />
            Upcoming events
          </h2>

          {events.rows.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {events.rows.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="text-xs text-ink-500">{formatDateTime(event.startsAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-500">No upcoming events right now.</p>
          )}
        </section>
      </div>

      {/* ========================================
          QUICK ACTIONS
          ======================================== */}
      <section className="flex flex-wrap gap-3">
        <ButtonLink href="/member/profile" variant="primary">
          <Icon name="edit" className="h-4 w-4" />
          Edit my profile
        </ButtonLink>
        <ButtonLink href="/join" variant="outline">
          <Icon name="user-plus" className="h-4 w-4" />
          Invite someone to join
        </ButtonLink>
        <ButtonLink href="/news" variant="ghost">
          All news and notices
        </ButtonLink>
      </section>
    </div>
  );
}
