// ========================================
// API - PRIVATE NOTES PAD
// ========================================
// Address: GET /api/notes        -> my notes (optionally ?q=search)
//          POST /api/notes       -> create a note
//
// WHO OWNS A NOTE
//   The signed-in person, and nobody else. ownerId comes from the SESSION and is
//   never read from the request body, so a caller cannot create a note "for"
//   somebody else, and cannot list another person's notes by changing a number.
//
// There is deliberately NO admin endpoint that returns other people's notes.
// ========================================

import { fail, ok, readJson } from '@/lib/api/http';
import { requireMemberApi } from '@/lib/api/guard';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 120;
const MAX_CONTENT = 20_000;

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return fail('The database is not set up yet.', 503);

  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';

  const notes = await prisma.personalNote.findMany({
    where: {
      ownerId: auth.user.id,
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' as const } },
              { content: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return ok({ notes });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return fail('The database is not set up yet.', 503);

  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const body = (await readJson(request)) as { title?: string; content?: string } | null;

  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '');

  if (title.length === 0) {
    return fail('Please give the note a title.', 422, { title: 'A title is required.' });
  }

  if (title.length > MAX_TITLE) {
    return fail(`Please keep the title under ${MAX_TITLE} characters.`, 422, {
      title: 'This title is too long.',
    });
  }

  if (content.length > MAX_CONTENT) {
    return fail('That note is too long. Please split it into two notes.', 422);
  }

  const note = await prisma.personalNote.create({
    data: { ownerId: auth.user.id, title, content },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return ok({ note }, 201, 'Note saved.');
}
