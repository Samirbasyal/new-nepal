import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// MEMBER PANEL
// This code controls the "My tasks" page.
// ========================================
// Address: /member/tasks
//
// Shows ONLY the tasks that an administrator has assigned to the signed-in
// member. The database query filters on  assignedToId = the member from the
// session, so another member's tasks can never appear here.
//
// The member can move a task between To do / In progress / Done. Only an
// administrator can create, edit or delete tasks.
// ========================================

import type { Metadata } from 'next';
import { requireMember } from '@/lib/auth/guards';
import { StatusBadge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskStatusControl } from '@/components/member/TaskStatusControl';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { readSettingValue } from '@/lib/settings';
import { formatDate, isUpcoming } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'member.tasks'), robots: { index: false, follow: false } };
}

export default async function MemberTasksPage() {
  const user = await requireMember();

  const tasks = isDatabaseConfigured()
    ? await prisma.task
        .findMany({
          // Only this member's tasks.
          where: { assignedToId: user.id },
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        })
        .catch(() => [])
    : [];

  // Admin Panel -> Settings -> Members. Default true, so nothing changes until
  // the office turns it off.
  const canUpdateTaskStatus =
    (await readSettingValue('members.canUpdateTaskStatus', 'true')).trim().toLowerCase() !== 'false';

  const todo = tasks.filter((task) => task.status === 'TODO');
  const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS');
  const done = tasks.filter((task) => task.status === 'DONE');

  const groups = [
    { title: 'To do', items: todo, icon: 'list' as const },
    { title: 'In progress', items: inProgress, icon: 'refresh' as const },
    { title: 'Done', items: done, icon: 'check-circle' as const },
  ];

  return (
    <div className="space-y-8">
      {/* ========================================
          HEADER + COUNTS
          ======================================== */}
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900">My tasks</h1>
        <p className="mt-1 text-sm text-ink-600">
          Tasks assigned to you by the organization. Update the status as you make progress.
        </p>

        {tasks.length > 0 ? (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'To do', value: todo.length },
              { label: 'In progress', value: inProgress.length },
              { label: 'Done', value: done.length },
            ].map((item) => (
              <div key={item.label} className="card p-4 text-center">
                <p className="text-2xl font-bold text-brand-700">{item.value}</p>
                <p className="text-xs text-ink-500">{item.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      {/* ========================================
          TASK LIST
          ======================================== */}
      {tasks.length > 0 ? (
        <div className="space-y-8">
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.title}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-600">
                  <Icon name={group.icon} className="h-4 w-4" />
                  {group.title} ({group.items.length})
                </h2>

                <ul className="space-y-3">
                  {group.items.map((task) => {
                    const overdue =
                      task.dueDate && task.status !== 'DONE' && !isUpcoming(task.dueDate);

                    return (
                      <li
                        key={task.id}
                        className={`card p-5 ${overdue ? 'border-red-200' : ''}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-ink-900">{task.title}</h3>

                            {task.description ? (
                              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                                {task.description}
                              </p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <StatusBadge status={task.status} />
                              {task.priority !== 'NORMAL' ? (
                                <StatusBadge status={task.priority} />
                              ) : null}

                              {task.dueDate ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs ${
                                    overdue ? 'font-semibold text-red-600' : 'text-ink-500'
                                  }`}
                                >
                                  <Icon name="clock" className="h-3.5 w-3.5" />
                                  Due {formatDate(task.dueDate)}
                                  {overdue ? ' (overdue)' : ''}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* ---------- Progress buttons ---------- */}
                        <div className="mt-4 border-t border-ink-100 pt-4">
                          <TaskStatusControl
                            taskId={task.id}
                            currentStatus={task.status}
                            canUpdate={canUpdateTaskStatus}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      ) : (
        <EmptyState
          icon="check-circle"
          title="You have no tasks at the moment"
          description="When an administrator assigns you a task it will appear here, and you will be able to mark your progress."
          action={
            <ButtonLink href="/member/dashboard" variant="outline">
              Back to dashboard
            </ButtonLink>
          }
        />
      )}
    </div>
  );
}
