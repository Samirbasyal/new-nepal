// ========================================
// API - SET A NEW DONOR PASSWORD
// ========================================
// Address: POST /api/donor/reset-password
// Body:    { token, password, confirmPassword? }
//
// WHAT MAKES THIS SAFE
//   - the token is 48 random hex characters, sent only by email
//   - it expires after 60 minutes and is stamped used the moment it works, so a
//     second attempt with the same link fails
//   - the new password is hashed with bcrypt before it touches the database; the
//     plain text is never stored, logged or emailed
//   - sessionVersion is increased, which ends every session that was already
//     open. If somebody else was signed in on another device, they are out.
//
// WHAT IT REFUSES
//   An expired, already-used or unknown link: all three get the same sentence,
//   because the difference is nobody's business but the account owner's.
// ========================================

import { checkPasswordStrength, hashPassword } from '@/lib/auth/password';
import { fail, ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { hashDonorToken, redeemResetToken } from '@/lib/donor/tokens';

export const dynamic = 'force-dynamic';

const BAD_LINK =
  'That reset link has expired or has already been used. Please ask for a new one from the sign-in page.';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const body = (await readJson(request)) as
    | { token?: string; password?: string; confirmPassword?: string }
    | null;

  const token = String(body?.token ?? '').trim();
  const password = String(body?.password ?? '');
  const confirm = body?.confirmPassword;

  if (!token) return fail('The reset link is incomplete. Please open it again from your email.', 422);

  const problems = checkPasswordStrength(password);
  if (problems.length > 0) {
    return fail(problems[0], 422, { password: problems[0] });
  }

  if (confirm != null && confirm !== password) {
    return fail('The two passwords do not match.', 422, {
      confirmPassword: 'The two passwords do not match.',
    });
  }

  // ---------- is this link still good? ----------
  // Checked before spending it, so a simple typo in the password box does not
  // burn the donor's only link.
  const usable = await prisma.donorToken
    .findUnique({ where: { tokenHash: hashDonorToken(token) } })
    .catch(() => null);

  if (!usable || usable.purpose !== 'PASSWORD_RESET' || usable.usedAt || usable.expiresAt.getTime() < Date.now()) {
    return fail(BAD_LINK, 422);
  }

  try {
    const redeemed = await redeemResetToken(token);
    if (!redeemed.ok || !redeemed.donorAccountId) return fail(BAD_LINK, 422);

    const donor = await prisma.donorAccount.findUnique({
      where: { id: redeemed.donorAccountId },
      select: { id: true, isActive: true },
    });

    if (!donor || !donor.isActive) {
      return fail('This account cannot be used. Please contact the office.', 403);
    }

    await prisma.donorAccount.update({
      where: { id: donor.id },
      data: {
        passwordHash: await hashPassword(password),
        // Ends every session that was open before the password changed.
        sessionVersion: { increment: 1 },
      },
    });

    // Any other outstanding reset link is now pointless.
    await prisma.donorToken
      .updateMany({
        where: { donorAccountId: donor.id, purpose: 'PASSWORD_RESET', usedAt: null },
        data: { usedAt: new Date() },
      })
      .catch(() => undefined);

    return ok(
      { reset: true },
      200,
      'Your new password is saved. Please sign in with it.',
    );
  } catch (error) {
    console.error('[donor-reset] could not save the password:', error);
    return fail('The password could not be saved right now. Please try again.', 500);
  }
}
