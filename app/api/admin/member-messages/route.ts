// ========================================
// API - MEMBER MESSAGES (THE OFFICE'S SIDE)
// ========================================
// Addresses:
//   GET  /api/admin/member-messages                 -> who has written to us
//   GET  /api/admin/member-messages?memberId=...     -> one member's conversation
//   POST /api/admin/member-messages                  -> the office replies
//
// WHY THIS IS A SEPARATE ADDRESS
//   /api/admin/messages is the generic Admin Panel section for the PUBLIC
//   CONTACT FORM (ContactMessage). This route is for the private conversation
//   between a member and the office (the Message table), so the two never get
//   mixed up.
//
// WHO MAY USE IT
//   Any administrator (requireAdminApi). The office has to be able to answer.
//
// WHAT HAPPENS WHEN THE OFFICE OPENS A THREAD
//   The member's own messages are marked as read for the office, and the other
//   way round is handled by the member's own route.
// ========================================

import { z } from 'zod';
import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';
import { writeActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const replySchema = z.object({
  memberId: z.string().trim().min(1, 'Please choose the member.'),
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
    .min(2, 'Please write your reply.')
    .max(4000, 'Please keep the reply under 4000 characters.'),
});

// ========================================
// WHO HAS WRITTEN TO US
// ========================================
export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return ok({ threads: [], messages: [] });

  const url = new URL(request.url);
  const memberId = url.searchParams.get('memberId');

  try {
    // ---------- one conversation ----------
    if (memberId) {
      const messages = await prisma.message.findMany({
        where: { threadMemberId: memberId },
        orderBy: { createdAt: 'asc' },
        take: 300,
        include: { sender: { select: { id: true, name: true, role: true } } },
      });

      // Opening the thread means the office has read the member's messages.
      await prisma.message.updateMany({
        where: { threadMemberId: memberId, senderId: memberId, readAt: null },
        data: { readAt: new Date() },
      });

      const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true, name: true, email: true, phone: true },
      });

      return ok({
        member,
        messages: messages.map((row) => ({
          id: row.id,
          subject: row.subject,
          body: row.body,
          mine: row.senderId !== memberId,
          senderName: row.sender?.name ?? 'Member',
          readAt: row.readAt,
          createdAt: row.createdAt,
        })),
      });
    }

    // ---------- the list of conversations ----------
    const recent = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { sender: { select: { id: true, name: true } } },
    });

    // One line per member, newest first.
    const threads = new Map<
      string,
      { memberId: string; lastMessage: string; lastAt: Date; fromMember: boolean; waiting: number }
    >();

    for (const row of recent) {
      const existing = threads.get(row.threadMemberId);

      if (!existing) {
        threads.set(row.threadMemberId, {
          memberId: row.threadMemberId,
          lastMessage: row.subject ?? row.body.slice(0, 80),
          lastAt: row.createdAt,
          fromMember: row.senderId === row.threadMemberId,
          waiting: row.senderId === row.threadMemberId && !row.readAt ? 1 : 0,
        });
      } else if (row.senderId === row.threadMemberId && !row.readAt) {
        existing.waiting += 1;
      }
    }

    const memberIds = [...threads.keys()];
    const members = memberIds.length
      ? await prisma.user.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const byId = new Map(members.map((member) => [member.id, member]));

    return ok({
      threads: [...threads.values()].map((thread) => ({
        ...thread,
        memberName: byId.get(thread.memberId)?.name ?? '(deleted account)',
        memberEmail: byId.get(thread.memberId)?.email ?? '',
      })),
      messages: [],
    });
  } catch (error) {
    console.error('[member-messages] could not load the conversations:', error);
    return serverError();
  }
}

// ========================================
// THE OFFICE REPLIES
// ========================================
export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  if (!body) return fail('The reply could not be read. Please try again.', 400);

  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { memberId, subject, body: text } = parsed.data;

  try {
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!member) return fail('That member account no longer exists.', 404);

    const created = await prisma.message.create({
      data: {
        threadMemberId: memberId,
        sender: { connect: { id: auth.user.id } },
        recipient: { connect: { id: memberId } },
        subject,
        body: text,
      },
    });

    await writeActivity({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'CREATE',
      entity: 'Member message',
      entityId: created.id,
      detail: `replied to ${member.name}`,
    });

    // ---------- tell the member ----------
    await notifyUser({
      userId: memberId,
      title: 'The office replied to your message',
      message: subject ?? text.slice(0, 120),
      type: 'INFO',
      link: '/member/messages',
    });

    return ok(
      {
        id: created.id,
        subject: created.subject,
        body: created.body,
        mine: true,
        senderName: auth.user.name,
        readAt: null,
        createdAt: created.createdAt,
      },
      201,
      `Reply sent to ${member.name}.`,
    );
  } catch (error) {
    console.error('[member-messages] could not save the reply:', error);
    return serverError();
  }
}
