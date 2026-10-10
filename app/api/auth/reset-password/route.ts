// ========================================
// API - RESET PASSWORD (STEP 2: CHOOSE THE NEW ONE)
// ========================================
// Address: POST /api/auth/reset-password
//
// EITHER the link from the email ({ token, password }) or the typed code
// ({ email, code, password }).
//
// WHAT HAPPENS ON SUCCESS
//   1. The new password is hashed with bcrypt (cost 12) and stored.
//   2. User.sessionVersion is increased by one. Every browser that was already
//      signed in is thrown out on its very next request, because its cookie
//      carries the old number (see lib/auth/guards.ts). That is what makes the
//      old password - and any stolen session - useless straight away.
//   3. The reset token is marked used, and all other outstanding reset tokens
//      are deleted.
//   4. The member is told by email that the password changed. If somebody else
//      did it, that message is the alarm bell.
//
// WHAT IS NEVER DONE
//   The password is never logged, never emailed and never placed in an address
//   bar. Only the bcrypt hash is stored.
// ========================================

import { hashPassword } from '@/lib/auth/password';
import { writeActivity } from '@/lib/audit';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import {
  RESET_PURPOSE,
  checkCode,
  clearTokens,
  consumeToken,
  findTokenByRaw,
} from '@/lib/auth/verification';
import { buildNotificationEmail } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/mailer';
import { notifyUser } from '@/lib/notifications';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const ipKey = ip ? `reset:${ip}` : null;

  if (ipKey) {
    const blocked = blockedForMinutes(ipKey);
    if (blocked > 0) return fail(blockMessage(blocked), 429);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { token, email, code, password } = parsed.data;

  // ========================================
  // WORK OUT WHICH ACCOUNT THIS IS
  // ========================================
  let userId: string | null = null;
  let tokenId: string | null = null;

  if (token) {
    const found = await findTokenByRaw(token, RESET_PURPOSE);

    if (!found) {
      if (ipKey) recordFailure(ipKey);
      return fail('This reset link is not valid. Please ask for a new one.', 400);
    }
    if (found.used) return fail('This reset link has already been used. Please ask for a new one.', 400);
    if (found.expired) return fail('This reset link has expired. Please ask for a new one.', 400);

    userId = found.userId;
    tokenId = found.id;
  } else if (email && code) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      if (ipKey) recordFailure(ipKey);
      return fail('That email address and code do not match. Please check and try again.', 400);
    }

    const result = await checkCode(user.id, code, RESET_PURPOSE);

    if (!result.ok) {
      if (ipKey) recordFailure(ipKey);

      const message =
        result.reason === 'expired'
          ? 'That code has expired. Please ask for a new one.'
          : result.reason === 'too-many'
            ? 'Too many wrong codes. For safety this code no longer works - please ask for a new one.'
            : result.reason === 'not-found' || result.reason === 'used'
              ? 'There is no reset code waiting for this address. Please ask for a new one.'
              : 'That code is not correct. Please check the six digits and try again.';

      return fail(message, 400);
    }

    userId = user.id;
    tokenId = result.tokenId;
  }

  if (!userId) {
    return fail('Please open the link from your email, or type the email address and code.', 422);
  }

  // ========================================
  // SAVE THE NEW PASSWORD
  // ========================================
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        // ---------- Throw every existing session out ----------
        sessionVersion: { increment: 1 },
      },
      select: { id: true, name: true, email: true },
    });

    // The token can never be reused.
    if (tokenId) await consumeToken(tokenId);
    await clearTokens(user.id, RESET_PURPOSE);

    if (ipKey) recordSuccess(ipKey);

    await writeActivity({
      actorId: user.id,
      actorName: user.name,
      action: 'UPDATE',
      entity: 'Password reset',
      entityId: user.id,
      detail: `${user.email} chose a new password; all older sessions were signed out`,
      newValue: 'password changed',
      ipAddress: ip,
    });

    await notifyUser({
      userId: user.id,
      title: 'Your password was changed',
      message:
        'Your password has been changed and every device that was signed in has been signed out. ' +
        'If this was not you, contact the organization office immediately.',
      type: 'WARNING',
      link: '/member/login',
    });

    // A security message by email too: this is one of the few events where an
    // email is genuinely worth sending.
    const mail = buildNotificationEmail({
      memberName: user.name,
      title: 'Your password was changed',
      message:
        'Your password has just been changed and all other devices were signed out. ' +
        'If you did not do this, contact the organization office straight away.',
      link: null,
    });

    void sendMail({
      to: user.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }).catch(() => undefined);

    return ok(
      { redirectTo: '/member/login' },
      200,
      'Your new password has been saved. Please sign in with it.',
    );
  } catch (error) {
    console.error('[reset-password] failed:', error);
    return fail('We could not save the new password. Please try again.', 500);
  }
}
