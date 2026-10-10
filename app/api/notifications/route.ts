// ========================================
// API - NOTIFICATIONS (MEMBER AND ADMIN)
// ========================================
// Addresses:
//   GET  /api/notifications              -> the signed-in person's notifications
//   POST /api/notifications              -> { action: "read", id } or { action: "read-all" }
//
// WHO MAY USE IT
//   Anybody who is signed in - a member sees their own, an administrator sees
//   theirs. There is no way to ask for somebody else's list: the user id is
//   taken from the signed-in session, never from the request.
//
// WHERE THE NOTIFICATIONS COME FROM
//   lib/notifications.ts writes them: the monthly fund (due, submitted,
//   approved, rejected), loans (approved, paid out, repayment, overdue,
//   completed), member accounts (created, verified, status changed) and notices
//   from the office.
// ========================================

import { getCurrentUser } from '@/lib/auth/guards';
import { fail, ok, readJson } from '@/lib/api/http';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from '@/lib/notifications';

// A notification list must never be cached: it changes the moment somebody
// approves a payment or records a repayment.
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail('Please sign in to see your notifications.', 401);

  const [notifications, unread] = await Promise.all([
    listNotifications(user.id, 60),
    unreadNotificationCount(user.id),
  ]);

  return ok({ notifications, unread });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('Please sign in first.', 401);

  const body = await readJson(request);
  if (!body) return fail('The request could not be read. Please try again.', 400);

  const action = String((body as Record<string, unknown>).action ?? '');

  // ---------- Mark everything as read ----------
  if (action === 'read-all') {
    const count = await markAllNotificationsRead(user.id);
    return ok(
      { unread: 0 },
      200,
      count > 0 ? `${count} notification(s) marked as read.` : 'Nothing was waiting to be read.',
    );
  }

  // ---------- Mark one as read ----------
  if (action === 'read') {
    const id = String((body as Record<string, unknown>).id ?? '');
    if (!id) return fail('Which notification should be marked as read?', 422);

    // markNotificationRead() only touches a row that belongs to this person, so
    // a made-up id cannot mark somebody else's notification.
    const changed = await markNotificationRead(id, user.id);

    if (!changed) {
      return fail('That notification was not found, or it was already marked as read.', 404);
    }

    const unread = await unreadNotificationCount(user.id);
    return ok({ unread }, 200, 'Marked as read.');
  }

  return fail('Unknown action. Please refresh the page and try again.', 422);
}
