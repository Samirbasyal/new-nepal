// ========================================
// ACTIVITY LOG (ADMIN DASHBOARD -> RECENT ACTIVITY)
// ========================================
// Records a short "who did what and when" line every time an administrator
// creates, edits or deletes something.
// The log is only visible to administrators.
//
// Writing a log line must never break the main action, so every error is
// swallowed after being printed to the terminal.
// ========================================

import { prisma, isDatabaseConfigured } from '@/lib/prisma';

// NOTE: APPROVE and REJECT were added for the money decisions (verifying a fund
// payment or a donation). A refusal deserves its own word in the history rather
// than being hidden inside "UPDATE".
export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SETTINGS';

export type ActivityInput = {
  actorId?: string | null;
  actorName?: string | null;
  action: ActivityAction;
  entity: string;
  entityId?: string | null;
  detail?: string | null;
  /**
   * FINANCIAL / SECURITY AUDIT DETAIL
   * What a value looked like before and after the change, for example
   *   oldValue: "PENDING", newValue: "APPROVED"
   * Used by the payment approvals, loan records and password resets, so a
   * dispute can always be settled by looking at the history.
   */
  oldValue?: string | null;
  newValue?: string | null;
  /** Which computer the change came from. */
  ipAddress?: string | null;
};

/** Save one activity line. Safe to call from anywhere. */
export async function writeActivity(input: ActivityInput): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        detail: input.detail ?? null,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error('[activity] could not write activity row:', error);
  }
}

/** Read the most recent activity lines (Admin Dashboard). */
export async function recentActivity(limit = 12) {
  if (!isDatabaseConfigured()) return [];
  try {
    return await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch {
    return [];
  }
}

/** Readable wording for the activity list, e.g. "created a new Program". */
export function describeActivity(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'added';
    case 'UPDATE':
      return 'updated';
    case 'DELETE':
      return 'deleted';
    case 'LOGIN':
      return 'signed in to';
    case 'LOGOUT':
      return 'signed out of';
    case 'SETTINGS':
      return 'changed settings for';
    default:
      return 'changed';
  }
}
