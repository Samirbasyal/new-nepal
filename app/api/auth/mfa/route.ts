// ========================================
// API - TWO-STEP VERIFICATION (the second half of the admin sign-in)
// ========================================
// Address: POST /api/auth/mfa     body: { code: "123456" }
//
// The password was already checked by /api/auth/login, which then handed the
// browser a signed challenge cookie instead of a session. This route swaps that
// challenge for a real session - but only if the 6-digit code is right.
//
// WHAT IT REFUSES
//   - no challenge cookie (expired after 10 minutes, or never signed in): 401
//   - an account that is no longer active, no longer an administrator, or has had
//     two-step verification switched off in the meantime: 403
//   - a wrong or stale code: 401, counted, and blocked after a few attempts
//
// WHY THE CODE CANNOT BE BRUTE-FORCED
//   Six digits is a million combinations, which sounds like a lot until you
//   remember a script can try thousands a second. So the same limiter that guards
//   the password guards this, keyed on the account: a handful of wrong codes and
//   the account pauses for a while. The code also changes every 30 seconds.
// ========================================

import { createSession } from '@/lib/auth/session';
import { clearMfaChallengeCookie, MFA_CHALLENGE_COOKIE, readMfaChallenge } from '@/lib/auth/mfa';
import { verifyCode } from '@/lib/auth/totp';
import { attemptsLeft, blockMessage, blockedForMinutes, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { writeActivity } from '@/lib/audit';
import { fail, ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { isAdminRole, normalizeRole } from '@/lib/constants';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Six digits, spaces allowed ("123 456") because people copy it from a phone.
const CODE_PATTERN = /^[0-9\s]{6,9}$/;

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const cookieStore = await cookies();
  const challenge = await readMfaChallenge(cookieStore.get(MFA_CHALLENGE_COOKIE)?.value);

  if (!challenge) {
    return fail(
      'Your sign-in took too long, or this page was opened in a different browser. Please enter your password again.',
      401,
    );
  }

  // ---------- Rate limit, per account ----------
  const limitKey = `mfa:${challenge.userId}`;
  const blockedFor = blockedForMinutes(limitKey);
  if (blockedFor > 0) {
    return fail(blockMessage(blockedFor), 429);
  }

  const body = (await readJson(request)) as { code?: unknown } | null;
  const rawCode = typeof body?.code === 'string' ? body.code : '';

  if (!CODE_PATTERN.test(rawCode)) {
    return fail('Please type the 6-digit code from your authenticator app.', 422, {
      code: 'The code is 6 digits.',
    });
  }

  // ---------- Who is halfway through signing in? ----------
  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
      sessionVersion: true,
      twoFactorSecret: true,
      twoFactorEnabledAt: true,
    },
  });

  if (!user || !user.isActive) {
    await clearMfaChallengeCookie();
    return fail('This account is not available. Please contact the organization office.', 403);
  }

  // Two-step verification may have been turned off between the two steps, or the
  // account may no longer be an administrator. Either way, this challenge is
  // worthless - a session must never be created from it.
  if (!isAdminRole(user.role) || !user.twoFactorEnabledAt || !user.twoFactorSecret) {
    await clearMfaChallengeCookie();
    return fail('This account does not need a verification code. Please sign in again.', 403);
  }

  // ---------- The code ----------
  if (!verifyCode(user.twoFactorSecret, rawCode)) {
    const blockedMinutes = recordFailure(limitKey);

    if (blockedMinutes > 0) {
      return fail(blockMessage(blockedMinutes), 429);
    }

    const left = attemptsLeft(limitKey);
    return fail(
      left <= 2
        ? `That code is not correct. ${left} attempt${left === 1 ? '' : 's'} left before signing in is paused.`
        : 'That code is not correct. Check the app and try the current code.',
      401,
      { code: 'That code is not correct.' },
    );
  }

  // ---------- Correct: swap the challenge for a session ----------
  recordSuccess(limitKey);

  await createSession(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
      sessionVersion: user.sessionVersion,
      emailVerified: true,
    },
    challenge.remember,
  );

  await clearMfaChallengeCookie();

  await prisma.user
    .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    .catch(() => undefined);

  await writeActivity({
    actorId: user.id,
    actorName: user.name,
    action: 'LOGIN',
    entity: challenge.portal === 'admin' ? 'Admin Panel' : 'Member Panel',
    detail: `${user.email} (two-step verification)`,
  });

  return ok(
    {
      id: user.id,
      name: user.name,
      role: normalizeRole(user.role),
      redirectTo: challenge.portal === 'admin' ? '/admin/dashboard' : '/member/dashboard',
    },
    200,
    `Welcome back, ${user.name}.`,
  );
}
