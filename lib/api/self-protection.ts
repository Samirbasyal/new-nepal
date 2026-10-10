// ========================================
// ADMIN PANEL - SELF-PROTECTION RULES
// ========================================
// Rules that stop an administrator from accidentally locking the whole
// organization out of its own Admin Panel.
//
// THE TWO RISKS
//   1. Deleting your own account, and then having no way back in.
//   2. Deleting the only remaining administrator account.
//
// Each function returns null when the action is allowed, or a friendly
// sentence explaining why it was refused.
// ========================================

import { prisma, isDatabaseConfigured } from '@/lib/prisma';

/** How many active administrator accounts exist? */
export async function adminCount(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  try {
    return await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
  } catch {
    return 0;
  }
}

/**
 * Used before deleting a user.
 * Returns a message when the delete must be refused.
 */
export async function assertNotLastAdmin(
  action: 'delete' | 'deactivate' | 'demote',
  targetUserId: string,
  currentUserId: string,
): Promise<string | null> {
  // Rule 1: you cannot destroy your own account.
  if (targetUserId === currentUserId) {
    if (action === 'delete') return 'You cannot delete your own account.';
    if (action === 'deactivate') return 'You cannot deactivate your own account.';
    if (action === 'demote') return 'You cannot change your own role.';
  }

  if (!isDatabaseConfigured()) return null;

  try {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true },
    });

    // Only administrators matter for this rule.
    if (!target || target.role !== 'ADMIN') return null;

    // Rule 2: never remove the last administrator.
    const remaining = await adminCount();
    if (remaining <= 1) {
      return (
        'This is the only administrator account. ' +
        'Create another administrator first, then try again.'
      );
    }

    return null;
  } catch {
    // If we cannot check, allow the caller to continue and let the normal
    // error handling report any real problem.
    return null;
  }
}
