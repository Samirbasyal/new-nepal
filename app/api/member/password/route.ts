// ========================================
// API - MEMBER PANEL: CHANGE MY PASSWORD
// ========================================
// Address: POST /api/member/password
//
// STEPS
//   1. The member must be signed in.
//   2. The CURRENT password is checked against the stored hash.
//      (This stops somebody who finds an unlocked computer from changing the
//      password and taking over the account.)
//   3. The new password is hashed with bcrypt and stored.
//
// The real password is never written to the database and never logged.
// ========================================

import { requireMemberApi } from '@/lib/api/guard';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { writeActivity } from '@/lib/audit';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { passwordChangeSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, passwordHash: true, email: true },
    });

    if (!user) return fail('Account not found.', 404);

    // ---------- Verify the current password ----------
    const currentIsCorrect = await verifyPassword(currentPassword, user.passwordHash);
    if (!currentIsCorrect) {
      return fail('Your current password is not correct.', 400, {
        currentPassword: 'That password is not correct.',
      });
    }

    // ---------- Do not allow re-using the same password ----------
    const sameAsBefore = await verifyPassword(newPassword, user.passwordHash);
    if (sameAsBefore) {
      return fail('Please choose a password you have not used before.', 400, {
        newPassword: 'This is already your current password.',
      });
    }

    // ---------- Save the new hash ----------
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    await writeActivity({
      actorId: user.id,
      actorName: auth.user.name,
      action: 'UPDATE',
      entity: 'Password',
      entityId: user.id,
      detail: user.email,
    });

    return ok({ changed: true }, 200, 'Your password has been updated.');
  } catch (error) {
    console.error('[member/password] failed:', error);
    return fail('Could not update your password. Please try again.', 500);
  }
}
