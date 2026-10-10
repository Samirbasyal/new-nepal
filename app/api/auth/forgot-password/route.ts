// ========================================
// API - FORGOT PASSWORD (STEP 1: ASK FOR A LINK)
// ========================================
// Address: POST /api/auth/forgot-password
//
// THE WORKFLOW
//   Forgot password -> type the registered email -> a REAL email is sent with a
//   link and a 6 digit code -> both expire after 30 minutes -> the member
//   chooses a new password (see reset-password).
//
// PRIVACY
//   The answer is always the same, whether or not the address exists. Otherwise
//   this page would tell a stranger exactly which emails the organization uses.
//
// WHAT IS NEVER DONE
//   - The old password is never emailed (nobody at the office can read it either,
//     because only a bcrypt hash is stored).
//   - The link and the code are never shown on the page.
// ========================================

import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { blockMessage, blockedForMinutes, clientKey, recordFailure } from '@/lib/auth/rate-limit';
import { NO_EMAIL_NOTICE, canSendNow, sendPasswordResetEmail } from '@/lib/auth/verification';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validation/schemas';

const GENERIC_MESSAGE =
  'If that email address belongs to an account, a message with a reset link is on its way. ' +
  'Please check your inbox and the spam folder. The link is valid for 30 minutes.';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const ipKey = ip ? `forgot:${ip}` : null;

  if (ipKey) {
    const blocked = blockedForMinutes(ipKey);
    if (blocked > 0) return fail(blockMessage(blocked), 429);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { email } = parsed.data;

  // ---------- Send limit per address ----------
  const limit = canSendNow(`reset:${email}`);
  if (!limit.allowed) {
    if (ipKey) recordFailure(ipKey);
    return fail(
      `A reset email was already sent recently. Please wait ${limit.waitMinutes} minute${
        limit.waitMinutes === 1 ? '' : 's'
      } before asking again, and check the spam folder.`,
      429,
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    // Unknown or switched-off account: the same friendly answer, nothing sent.
    if (!user || !user.isActive) {
      return ok({ sent: false }, 200, GENERIC_MESSAGE);
    }

    const result = await sendPasswordResetEmail(user, ip);

    if (!result.ok) {
      return fail(
        result.skipped ? NO_EMAIL_NOTICE : result.error ?? 'The email could not be sent.',
        502,
      );
    }

    return ok({ sent: true }, 200, GENERIC_MESSAGE);
  } catch (error) {
    console.error('[forgot-password] failed:', error);
    return fail('We could not send the email just now. Please try again in a few minutes.', 500);
  }
}
