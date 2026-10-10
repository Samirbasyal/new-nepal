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

    for (const admin of admins) {
      await notifyUser({
        userId: admin.id,
        title: input.title,
        message: input.message,
        type: input.type ?? 'INFO',
        link: input.link ?? null,
        email: input.email,
      });
    }
  } catch (error) {
    console.error('[notifications] could not notify administrators:', error);
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
