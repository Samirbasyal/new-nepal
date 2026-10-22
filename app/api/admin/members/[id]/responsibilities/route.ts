// ========================================
// API - PERMANENT RESPONSIBILITIES OF ONE MEMBER
// ========================================
// Address: /api/admin/members/<memberId>/responsibilities
//
//   GET     list the member's permanent duties
//   POST    add one            { title?, description }
//   PATCH   change one         { id, title?, description?, isActive? }
//   DELETE  remove one         { id }
//
// WHO MAY CALL IT
//   Only an administrator: requireAdminApi runs on the server before anything
//   else, so hiding the button in the browser protects nothing and is not what
//   we rely on.
//
// NOTHING HERE HAS A DEADLINE
//   Permanent duties never expire and are never deleted automatically. When one
//   is removed we keep a copy in member_responsibility_audit first.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import {
  addResponsibility,
  deleteResponsibility,
  updateResponsibility,
} from '@/lib/members/service';

export const dynamic = 'force-dynamic';

type Body = {
  id?: string;
  title?: string | null;
  description?: string;
  isActive?: boolean;
};

async function memberExists(memberId: string) {
  const found = await prisma.memberProfile.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  return Boolean(found);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;

  try {
    const rows = await prisma.memberResponsibility.findMany({
      where: { memberProfileId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return ok({ responsibilities: rows });
  } catch (error) {
    return serverError(error, 'Could not load the responsibilities.');
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const body = (await readJson(request)) as Body | null;
  const description = body?.description?.trim();

  if (!description) {
    return fail('Write the responsibility first.', 422, {
      description: 'Write the responsibility first.',
    });
  }

  try {
    if (!(await memberExists(id))) return fail('That member was not found.', 404);

    const created = await addResponsibility({
      memberProfileId: id,
      title: body?.title ?? null,
      description,
      adminId: auth.user.id,
    });

    return ok({ responsibility: created }, 201, 'Responsibility added.');
  } catch (error) {
    return serverError(error, 'Could not save the responsibility.');
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const body = (await readJson(request)) as Body | null;

  if (!body?.id) return fail('Which responsibility should change?', 422);
  if (body.description !== undefined && !body.description.trim()) {
    return fail('A responsibility cannot be empty.', 422, {
      description: 'A responsibility cannot be empty.',
    });
  }

  try {
    const updated = await updateResponsibility({
      id: body.id,
      memberProfileId: id,
      title: body.title,
      description: body.description,
      isActive: body.isActive,
      adminId: auth.user.id,
    });

    if (!updated) return fail('That responsibility was not found.', 404);
    return ok({ responsibility: updated }, 200, 'Responsibility updated.');
  } catch (error) {
    return serverError(error, 'Could not update the responsibility.');
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const body = (await readJson(request)) as Body | null;

  if (!body?.id) return fail('Which responsibility should be removed?', 422);

  try {
    const removed = await deleteResponsibility({
      id: body.id,
      memberProfileId: id,
      adminId: auth.user.id,
    });

    if (!removed) return fail('That responsibility was not found.', 404);
    return ok({ id: removed.id }, 200, 'Responsibility removed.');
  } catch (error) {
    return serverError(error, 'Could not remove the responsibility.');
  }
}
