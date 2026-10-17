// ========================================
// NOTIFICATIONS - ONE PLACE FOR EVERY MESSAGE TO A PERSON
// ========================================
// Every part of the website that needs to tell somebody something goes through
// this file: the monthly fund, payments, loans, the committee, district work and
// ordinary notices from an administrator.
//
// WHY ONE FILE?
//   So that "where do notifications come from?" has exactly one answer. If the
//   organization later wants to add SMS or WhatsApp, only this file changes.
//
// TWO KINDS OF MESSAGE
//   1. In-app  -> a row in the "notifications" table, shown in the bell and on
//                 the Notifications page. This is always created.
//   2. Email   -> optional, and only for things that matter ("your payment was
//                 approved", "a loan return was recorded"). Set email: true.
//                 Sending email on every tiny event would train people to
//                 ignore the messages.
// ========================================

import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { buildNotificationEmail } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/mailer';
import { ADMIN_ROLES } from '@/lib/constants';

export type NotifyInput = {
  userId: string;
  title: string;
  message: string;
  /** INFO / SUCCESS / WARNING / ERROR - decides the colour of the badge. */
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  /** An optional page to open when the notification is clicked. */
  link?: string | null;
  /** Also send this by email? Off by default. */
  email?: boolean;
  /** Label for the email button, e.g. "See my payments". */
  emailLinkLabel?: string;
};

/**
 * Tell ONE person something.
 *
 * This never throws: a notification is a courtesy, and it must never be the
 * reason a payment or a loan record fails to save. Any problem is logged and
 * swallowed.
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const person = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, email: true },
    });

    if (!person) return;

    await prisma.notification.create({
      data: {
        userId: person.id,
        title: input.title,
        message: input.message,
        type: input.type ?? 'INFO',
        link: input.link ?? null,
      },
    });

    if (input.email && person.email) {
      const mail = buildNotificationEmail({
        memberName: person.name,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        linkLabel: input.emailLinkLabel,
      });

      // Deliberately not awaited: the person's action should not wait for a
      // mail server. sendMail already logs its own failures.
      void sendMail({
        to: person.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }).catch(() => undefined);
    }
  } catch (error) {
    console.error('[notifications] could not notify a user:', error);
  }
}

/**
 * Tell EVERY administrator something (a new member, a payment waiting to be
 * verified, a loan return recorded...).
 *
 * The message is only written to administrators who are switched on.
 */
export async function notifyAdmins(input: {
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  link?: string | null;
  email?: boolean;
  /** Skip this administrator (usually the one who performed the action). */
  exceptUserId?: string | null;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ADMIN_ROLES },
        isActive: true,
        ...(input.exceptUserId ? { id: { not: input.exceptUserId } } : {}),
      },
      select: { id: true },
    });

    // ---------- there is nobody to tell ----------
    // A configuration problem, not a silence to hide: with no active
    // administrator nobody would ever see the bell. The log says so plainly.
    if (admins.length === 0) {
      console.warn(
        '[notifications] no active administrator was found, so this was not delivered:',
        input.title,
      );
      return;
    }

    // ---------- one INSERT for all of them ----------
    // The old loop created the rows one at a time and stopped at the first
    // failure, so some administrators could be notified and others not. A single
    // createMany writes every row or none.
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: input.title,
        message: input.message,
        type: input.type ?? 'INFO',
        link: input.link ?? null,
      })),
    });

    // Email is a separate, optional step: it needs each address and a working
    // mail server, and a mail failure must never undo the bell.
    if (input.email) {
      void notifyAdminsByEmail(
        admins.map((admin) => admin.id),
        input,
      );
    }
  } catch (error) {
    console.error('[notifications] could not notify administrators:', error);
  }
}

/**
 * The optional email half of notifyAdmins(), kept out of the main path so the
 * database write is never delayed by a mail server.
 */
async function notifyAdminsByEmail(
  userIds: string[],
  input: { title: string; message: string; link?: string | null },
): Promise<void> {
  try {
    const people = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { name: true, email: true },
    });

    for (const person of people) {
      if (!person.email) continue;

      const mail = buildNotificationEmail({
        memberName: person.name,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
      });

      void sendMail({
        to: person.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }).catch(() => undefined);
    }
  } catch (error) {
    console.error('[notifications] could not email administrators:', error);
  }
}

// ========================================
// READING NOTIFICATIONS (bell + page)
// ========================================

/** How many unread messages this person has (the number on the bell). */
export async function unreadNotificationCount(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  try {
    return await prisma.notification.count({ where: { userId, isRead: false } });
  } catch {
    return 0;
  }
}

/** The newest notifications for one person. */
export async function listNotifications(userId: string, limit = 50) {
  if (!isDatabaseConfigured()) return [];
  try {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch {
    return [];
  }
}

/** Mark one notification as read. Only its owner can do this. */
export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    // The userId is part of the WHERE clause on purpose: passing somebody
    // else's notification id changes nothing.
    const result = await prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return result.count > 0;
  } catch {
    return false;
  }
}

/** Mark everything as read. Returns how many rows changed. */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return result.count;
  } catch {
    return 0;
  }
}

// ========================================
// DELETING NOTIFICATIONS
// ========================================
// A notification is a message, not a record. Keeping a stale one - "new donation
// submitted" for a donation that has since been deleted - is worse than having no
// notification at all, because it sends people to a page that no longer exists.
//
// Every function here takes the owner's id and puts it in the WHERE clause, so a
// made-up id cannot remove somebody else's message.

/** Remove one notification. Returns how many rows went (0 or 1). */
export async function deleteNotification(id: string, userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    const result = await prisma.notification.deleteMany({ where: { id, userId } });
    return result.count;
  } catch {
    return 0;
  }
}

/** Remove every notification this person has already read. */
export async function deleteReadNotifications(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    const result = await prisma.notification.deleteMany({ where: { userId, isRead: true } });
    return result.count;
  } catch {
    return 0;
  }
}

/**
 * Sweep away notices that point at a donation which no longer exists.
 *
 * WHY THIS IS NEEDED AT ALL
 *   Deleting a donation already removes the notifications that name it (see
 *   lib/donation/delete.ts). But a notice created by an OLDER version of the site
 *   - before the link carried the donation id - says only "new donation
 *   submitted", so nothing could match it to the record. Those are exactly the
 *   ones that linger after a demo entry is deleted.
 *
 * HOW IT DECIDES
 *   Only notices whose link contains "#donation-" are examined, and only the ones
 *   whose donation id no longer exists in the table are removed. A notice about a
 *   donation that is still there is never touched.
 */
export async function purgeStaleDonationNotifications(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    const rows = await prisma.notification.findMany({
      where: { userId, link: { contains: '#donation-' } },
      select: { id: true, link: true },
      take: 200,
    });

    if (rows.length === 0) return 0;

    const pairs = rows
      .map((row) => {
        const after = (row.link ?? '').split('#donation-')[1] ?? '';
        const donationId = after.split(/[^A-Za-z0-9_-]/)[0];
        return { notificationId: row.id, donationId };
      })
      .filter((pair) => pair.donationId !== '');

    if (pairs.length === 0) return 0;

    const alive = await prisma.donation.findMany({
      where: { id: { in: pairs.map((pair) => pair.donationId) } },
      select: { id: true },
    });

    const stillThere = new Set(alive.map((row) => row.id));
    const stale = pairs.filter((pair) => !stillThere.has(pair.donationId)).map((pair) => pair.notificationId);

    if (stale.length === 0) return 0;

    const removed = await prisma.notification.deleteMany({
      where: { id: { in: stale }, userId },
    });

    return removed.count;
  } catch {
    return 0;
  }
}