// ========================================
// API - SEND THE VERIFICATION EMAIL AGAIN
// ========================================
// Address: POST /api/auth/resend-verification
//
// WHEN A MEMBER USES THIS
//   The first email never arrived, or the link expired (they last 24 hours).
//
// THREE PROTECTIONS
//   1. Rate limiting: at most 4 sends per address in 30 minutes
//      (lib/auth/verification.ts -> canSendNow).
//   2. The same answer is given whether or not the address exists, so this
//      page cannot be used to find out who is registered.
//   3. An already verified member is NOT sent another link - there would be
//      nothing to verify.
// ========================================

import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { blockMessage, blockedForMinutes, clientKey, recordFailure } from '@/lib/auth/rate-limit';
import { NO_EMAIL_NOTICE, canSendNow, sendVerificationEmail } from '@/lib/auth/verification';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/constants';
import { resendVerificationSchema } from '@/lib/validation/schemas';

// One answer for every situation. Read the notes at the top of the file.
const GENERIC_MESSAGE =
  'If that email address belongs to a member account that still needs verifying, a new ' +
  'link is on its way. Please check your inbox and the spam folder.';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const ipKey = ip ? `resend:${ip}` : null;

  if (ipKey) {
    const blocked = blockedForMinutes(ipKey);
    if (blocked > 0) return fail(blockMessage(blocked), 429);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = resendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { email } = parsed.data;

  // ---------- How often may we send to this address? ----------
  const limit = canSendNow(`verify:${email}`);
  if (!limit.allowed) {
    if (ipKey) recordFailure(ipKey);
    return fail(
      `A verification email was already sent recently. Please wait ${limit.waitMinutes} minute${
        limit.waitMinutes === 1 ? '' : 's'
      } before asking for another one, and check the spam folder.`,
      429,
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    // Nothing to do, but the caller is told the same thing either way.
    if (!user || !user.isActive || user.emailVerifiedAt || isAdminRole(user.role)) {
      return ok({ sent: false }, 200, GENERIC_MESSAGE);
    }

    const result = await sendVerificationEmail(user, { requestIp: ip });

    if (!result.ok) {
      // Be honest with the person standing in front of the screen: the email
      // did NOT go out. (The generic answer above is about privacy; this one is
      // about not pretending.)
      return fail(result.skipped ? NO_EMAIL_NOTICE : result.error ?? 'The email could not be sent.', 502);
    }

    return ok({ sent: true }, 200, GENERIC_MESSAGE);
  } catch (error) {
    console.error('[resend-verification] failed:', error);
    return fail('We could not send the email just now. Please try again in a few minutes.', 500);
  }
}
