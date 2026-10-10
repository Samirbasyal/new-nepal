// ========================================
// API - MEMBER MESSAGES (MEMBER <-> OFFICE)
// ========================================
// Addresses:
//   GET  /api/member/messages   -> this member's own conversation
//   POST /api/member/messages   -> the member writes to the office
//
// ONE CONVERSATION PER MEMBER
//   Every message carries threadMemberId, which is always the MEMBER's user id.
//   A member therefore reads the whole exchange between themselves and the
//   office, and never sees anybody else's.
//
// WHO MAY WRITE
//   Only members (and administrators who are also members). requireMemberApi()
//   takes the sender from the signed-in session, so the "from" can never be
//   faked, and it also refuses a member whose email is not verified yet.
//
// THE OFFICE IS TOLD
//   A new message raises a notification for every administrator, so it cannot
//   sit unread by accident.
// ========================================

import { z } from 'zod';
import { requireMemberApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { notifyAdmins } from '@/lib/notifications';
import { writeActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const sendSchema = z.object({
  subject: z
    .string()
    .trim()
    .max(160, 'Please keep the subject under 160 characters.')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  body: z
    .string()
    .trim()
    .min(2, 'Please write your message.')
    .max(4000, 'Please keep the message under 4000 characters.'),
});

export async function GET(request: Request) {
  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return ok({ messages: [], unread: 0 });

  try {
    const messages = await prisma.message.findMany({
      where: { threadMemberId: auth.user.id },
      orderBy: { createdAt: 'asc' },
      take: 300,
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } },
      },
    });

    // ---------- opening the conversation counts as reading it ----------
    // Only the messages the office sent TO this member are marked.
    const unread = messages.filter((row) => row.senderId !== auth.user.id && !row.readAt).length;

    if (unread > 0) {
      await prisma.message.updateMany({
        where: {
          threadMemberId: auth.user.id,
          senderId: { not: auth.user.id },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }

    return ok({
      messages: messages.map((row) => ({
        id: row.id,
        subject: row.subject,
        body: row.body,
        mine: row.senderId === auth.user.id,
        senderName: row.sender?.name ?? 'The office',
        senderRole: row.sender?.role ?? 'ADMIN',
        readAt: row.readAt,
        createdAt: row.createdAt,
      })),
      unread,
    });
  } catch (error) {
    console.error('[messages] could not load the member conversation:', error);
    return serverError();
  }
}

export async function POST(request: Request) {
  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  if (!body) return fail('The message could not be read. Please try again.', 400);

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  try {
    const created = await prisma.message.create({
      data: {
        // The thread is always the member's own id, taken from the session.
        threadMemberId: auth.user.id,
        sender: { connect: { id: auth.user.id } },
        subject: parsed.data.subject,
        body: parsed.data.body,
      },
    });

    await writeActivity({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'CREATE',
      entity: 'Member message',
      entityId: created.id,
      detail: parsed.data.subject ?? parsed.data.body.slice(0, 60),
    });

    // ---------- tell the office ----------
    await notifyAdmins({
      title: `New message from ${auth.user.name}`,
      message: parsed.data.subject ?? parsed.data.body.slice(0, 120),
      type: 'INFO',
      link: '/admin/messages',
      exceptUserId: auth.user.id,
    });

    return ok(
      {
        id: created.id,
        subject: created.subject,
        body: created.body,
        mine: true,
        senderName: auth.user.name,
        createdAt: created.createdAt,
        readAt: null,
      },
      201,
      'Your message has been sent to the office.',
    );
  } catch (error) {
    console.error('[messages] could not save the member message:', error);
    return serverError();
  }
}
