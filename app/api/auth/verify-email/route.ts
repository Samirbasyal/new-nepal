// ========================================
// API - VERIFY AN EMAIL ADDRESS
// ========================================
// Address: POST /api/auth/verify-email
//
// TWO WAYS IN, ONE RESULT
//   1. { token: "..." }          -> the member clicked the link in the email
//   2. { email: "...", code: "..." } -> the member typed the 6 digit code
//
// WHAT HAPPENS
//   - The token/code is checked against the stored FINGERPRINT.
//   - It must not be expired and must not have been used before.
//   - On success the account is marked verified and the token is thrown away.
//   - The member is then sent to the sign-in page.
//
// WHY THE ANSWERS ARE CAREFUL
//   If this endpoint said "that email address does not exist", anybody could use
//   it to discover which addresses the organization has on file. So a wrong
//   email and a wrong code give exactly the same answer.
// ========================================

import { writeActivity } from '@/lib/audit';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { VERIFY_PURPOSE, checkCode, consumeToken, findTokenByRaw, markEmailVerified } from '@/lib/auth/verification';
import { notifyAdmins, notifyUser } from '@/lib/notifications';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { verifyEmailSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  // ---------- Rate limiting ----------
  const ip = clientKey(request);
  const ipKey = ip ? `verify:${ip}` : null;

  if (ipKey) {
    const blocked = blockedForMinutes(ipKey);
    if (blocked > 0) return fail(blockMessage(blocked), 429);
  }

  // ---------- Read the form ----------
  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { token, email, code } = parsed.data;

  // ========================================
  // ROUTE 1: the link in the email
  // ========================================
  if (token) {
    const found = await findTokenByRaw(token, VERIFY_PURPOSE);

    if (!found) {
      if (ipKey) recordFailure(ipKey);
      return fail('This verification link is not valid. Please ask for a new one.', 400);
    }

    if (found.used) {
      return fail(
        'This link has already been used. If your email is verified, simply sign in.',
        400,
      );
    }

    if (found.expired) {
      return fail('This verification link has expired. Please ask for a new one.', 400);
    }

    // ---------- Success ----------
    await markEmailVerified(found.userId);
    await consumeToken(found.id);
    if (ipKey) recordSuccess(ipKey);

    return finish(found.userId, 'link');
  }

  // ========================================
  // ROUTE 2: the typed code
  // ========================================
  if (email && code) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, emailVerifiedAt: true },
    });

    // A wrong email must look exactly like a wrong code.
    if (!user) {
      if (ipKey) recordFailure(ipKey);
      return fail('That email address and code do not match. Please check and try again.', 400);
    }

    if (user.emailVerifiedAt) {
      return ok(
        { alreadyVerified: true, redirectTo: '/member/login' },
        200,
        'This email address is already verified. You can sign in.',
      );
    }

    const result = await checkCode(user.id, code, VERIFY_PURPOSE);

    if (!result.ok) {
      if (ipKey) recordFailure(ipKey);

      const message =
        result.reason === 'expired'
          ? 'That code has expired. Please ask for a new one.'
          : result.reason === 'used'
            ? 'That code has already been used. Please ask for a new one.'
            : result.reason === 'too-many'
              ? 'Too many wrong codes. For safety this code no longer works - please ask for a new one.'
              : result.reason === 'not-found'
                ? 'There is no code waiting for this address. Please ask for a new one.'
                : 'That code is not correct. Please check the six digits and try again.';

      return fail(message, 400);
    }

    await markEmailVerified(user.id);
    await consumeToken(result.tokenId);
    if (ipKey) recordSuccess(ipKey);

    return finish(user.id, 'code');
  }

  return fail('Please open the link from your email, or type the email address and code.', 422);
}

// ========================================
// SHARED SUCCESS HANDLING
// ========================================
async function finish(userId: string, how: 'link' | 'code') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (user) {
    await writeActivity({
      actorId: user.id,
      actorName: user.name,
      action: 'UPDATE',
      entity: 'Email verified',
      entityId: user.id,
      detail: `${user.email} verified using the ${how}`,
    });

    // NO notification to the member for their own action.
    //
    // Verifying an email is something the member did themselves. The member's bell
    // is reserved for changes an ADMINISTRATOR makes - duties, monthly tasks,
    // published scores, office messages - so it stays meaningful. The office is
    // still told, just below.

    // The office likes to know when an invited member completes the step.
    await notifyAdmins({
      title: 'Member verified their email',
      message: `${user.name} (${user.email}) has verified their email address and can now sign in.`,
      type: 'SUCCESS',
      link: '/admin/members',
    });
  }

  return ok(
    { redirectTo: '/member/login' },
    200,
    'Thank you - your email address is verified. You can sign in now.',
  );
}
