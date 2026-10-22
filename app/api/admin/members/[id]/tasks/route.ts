// ========================================
// API - MONTHLY TASKS OF ONE MEMBER
// ========================================
// Address: /api/admin/members/<memberId>/tasks
//
//   GET     list (optionally ?month=2026-10)
//   POST    add      { title, description?, periodMonth, status?, remarks? }
//   PATCH   change   { id, status?, remarks?, title?, description? }
//   DELETE  remove   { id }
//
// MONTHLY TASKS ARE NOT PERMANENT DUTIES
//   A task belongs to one month and can be finished. A permanent responsibility
//   lives in another table, has no month and never expires.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { isValidMonth } from '@/lib/members/service';

export const dynamic = 'force-dynamic';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

type Body = {
  id?: string;
  title?: string;
  description?: string | null;
  periodMonth?: string;
  status?: string;
  remarks?: string | null;
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const url = new URL(request.url);
  const month = url.searchParams.get('month');

  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!profile) return fail('That member was not found.', 404);

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: profile.userId,
        ...(isValidMonth(month) ? { periodMonth: month } : {}),
      },
      orderBy: [{ periodMonth: 'desc' }, { createdAt: 'desc' }],
    });

    return ok({ tasks });
  } catch (error) {
    return serverError(error, 'Could not load the tasks.');
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const body = (await readJson(request)) as Body | null;
  const title = body?.title?.trim();

  if (!title) {
    return fail('Give the task a title.', 422, { title: 'Give the task a title.' });
  }
  if (!isValidMonth(body?.periodMonth)) {
    return fail('Choose the month this task belongs to.', 422, {
      periodMonth: 'Choose the month this task belongs to.',
    });
  }
  if (body?.status && !STATUSES.includes(body.status)) {
    return fail('Unknown task status.', 422);
  }

  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!profile) return fail('That member was not found.', 404);

    const task = await prisma.task.create({
      data: {
        title,
        description: body?.description?.trim() || null,
        periodMonth: body?.periodMonth,
        status: body?.status ?? 'TODO',
        remarks: body?.remarks?.trim() || null,
        assignedToId: profile.userId,
        createdById: auth.user.id,
      },
    });

    return ok({ task }, 201, 'Task assigned.');
  } catch (error) {
    return serverError(error, 'Could not save the task.');
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const body = (await readJson(request)) as Body | null;

  if (!body?.id) return fail('Which task should change?', 422);
  if (body.status && !STATUSES.includes(body.status)) {
    return fail('Unknown task status.', 422);
  }

  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!profile) return fail('That member was not found.', 404);

    // A task may only be changed through the member it belongs to, so an id from
    // another member's file cannot be used here.
    const existing = await prisma.task.findFirst({
      where: { id: body.id, assignedToId: profile.userId },
      select: { id: true, status: true, completedAt: true },
    });
    if (!existing) return fail('That task was not found for this member.', 404);

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.remarks !== undefined ? { remarks: body.remarks?.trim() || null } : {}),
        // Finishing a task stamps the date once; reopening clears it.
        ...(body.status === 'DONE'
          ? { completedAt: existing.completedAt ?? new Date() }
          : body.status
            ? { completedAt: null }
            : {}),
      },
      });

    return ok({ task }, 200, 'Task updated.');
  } catch (error) {
    return serverError(error, 'Could not update the task.');
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const body = (await readJson(request)) as Body | null;
  if (!body?.id) return fail('Which task should be removed?', 422);

  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!profile) return fail('That member was not found.', 404);

    const existing = await prisma.task.findFirst({
      where: { id: body.id, assignedToId: profile.userId },
      select: { id: true },
    });
    if (!existing) return fail('That task was not found for this member.', 404);

    await prisma.task.delete({ where: { id: existing.id } });
    return ok({ id: existing.id }, 200, 'Task removed.');
  } catch (error) {
    return serverError(error, 'Could not remove the task.');
  }
}
