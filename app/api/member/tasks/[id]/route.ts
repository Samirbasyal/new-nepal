// ========================================
// API - MEMBER PANEL: UPDATE MY TASK STATUS
// ========================================
// Address: POST /api/member/tasks/<taskId>
//
// A member may move their OWN task between:
//   TODO  ->  IN_PROGRESS  ->  DONE
//
// WHAT A MEMBER MAY NOT DO HERE
//   - change the task title or description
//   - change who the task is assigned to
//   - touch a task that belongs to somebody else
//   - create or delete tasks
//
// Progress updates are the administrator's job (Admin Panel -> Member tasks).
// ========================================

import { requireMemberApi } from '@/lib/api/guard';
import { fail, ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { TASK_STATUS_OPTIONS } from '@/lib/constants';
import { readSettingValue } from '@/lib/settings';

const ALLOWED_STATUSES = TASK_STATUS_OPTIONS.map((option) => option.value);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const body = (await readJson(request)) as { status?: string } | null;
  const requested = String(body?.status ?? '').toUpperCase();

  if (!ALLOWED_STATUSES.includes(requested)) {
    return fail('Please choose a valid task status.', 422);
  }

  // ---------- Ownership check ----------
  // NOTE the "assignedToId: auth.user.id" part below. It means a member can
  // only ever change a task that was given to THEM. Trying to change somebody
  // else's task simply finds no record and returns "not found".
  const task = await prisma.task.findFirst({
    where: { id, assignedToId: auth.user.id },
    select: { id: true, status: true, title: true },
  });

  if (!task) {
    return fail('That task could not be found, or it is not assigned to you.', 404);
  }

  // ---------- Has the office allowed this? ----------
  // Admin Panel -> Settings -> Members -> "Allow members to change their own task
  // status". Default true. When it is switched off the button is also hidden in
  // the member panel, but the real refusal happens here, on the server.
  const allowed = (await readSettingValue('members.canUpdateTaskStatus', 'true'))
    .trim()
    .toLowerCase() !== 'false';

  if (!allowed) {
    return fail(
      'The office has turned off member task updates. Please ask an administrator to record your progress.',
      403,
    );
  }

  // The status and its history entry are written together: either both are saved
  // or neither is, so a task can never move without leaving a trace.
  await prisma.$transaction([
    prisma.task.update({
      where: { id: task.id },
      data: {
        status: requested,
        // DONE stamps the completion date; moving back clears it.
        completedAt: requested === 'DONE' ? new Date() : null,
      },
    }),
    prisma.taskUpdate.create({
      data: {
        taskId: task.id,
        status: requested,
        note: `Changed by the member from ${task.status} to ${requested}.`,
        byId: auth.user.id,
      },
    }),
  ]);

  return ok({ id: task.id, status: requested }, 200, 'Task updated.');
}
