// ========================================
// API - ONE PRIVATE NOTE
// ========================================
// Address: PATCH  /api/notes/<noteId>   -> save changes
//          DELETE /api/notes/<noteId>   -> delete it
//
// Every query includes ownerId: auth.user.id. A note that belongs to somebody
// else simply "does not exist" from here - which is exactly what an outsider
// should be told.
// ========================================

import { fail, ok, readJson } from '@/lib/api/http';
import { requireMemberApi } from '@/lib/api/guard';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 120;
const MAX_CONTENT = 20_000;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return fail('The database is not set up yet.', 503);

  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await readJson(request)) as { title?: string; content?: string } | null;

  const existing = await prisma.personalNote.findFirst({
    where: { id, ownerId: auth.user.id },
    select: { id: true },
  });

  if (!existing) return fail('That note could not be found.', 404);

  const data: { title?: string; content?: string } = {};

  if (typeof body?.title === 'string') {
    const title = body.title.trim();
    if (title.length === 0) {
      return fail('Please give the note a title.', 422, { title: 'A title is required.' });
    }
    if (title.length > MAX_TITLE) {
      return fail(`Please keep the title under ${MAX_TITLE} characters.`, 422);
    }
    data.title = title;
  }

  if (typeof body?.content === 'string') {
    if (body.content.length > MAX_CONTENT) {
      return fail('That note is too long. Please split it into two notes.', 422);
    }
    data.content = body.content;
  }

  const note = await prisma.personalNote.update({
    where: { id: existing.id },
    data,
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return ok({ note }, 200, 'Note saved.');
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return fail('The database is not set up yet.', 503);

  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const existing = await prisma.personalNote.findFirst({
    where: { id, ownerId: auth.user.id },
    select: { id: true },
  });

  if (!existing) return fail('That note could not be found.', 404);

  await prisma.personalNote.delete({ where: { id: existing.id } });

  return ok({ id: existing.id }, 200, 'Note deleted.');
}
