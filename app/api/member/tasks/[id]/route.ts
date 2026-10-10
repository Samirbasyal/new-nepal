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

  await prisma.task.update({
    where: { id: task.id },
    data: { status: requested },
  });

  return ok({ id: task.id, status: requested }, 200, 'Task updated.');
}
