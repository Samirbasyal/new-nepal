// ========================================
// API - DONOR SIGN IN
// ========================================
// Address: POST /api/donor/login   (public)
// Body:    { email, password, remember? }
//
// ONE MESSAGE FOR EVERY FAILURE
//   "The email address or password is not correct."
//   Saying "no such account" would turn this page into a way of finding out who
//   has donated to the club, which is nobody's business.
//
// TIMING
//   A password is always checked, even when the email is unknown, so an attacker
//   cannot tell the two cases apart by how long the answer takes.
//
// LOCKOUT
//   Repeated failures from one address block that address for a while
//   (lib/auth/rate-limit). The block is reported plainly, because a person who
//   is doing nothing wrong deserves to know why they cannot get in.
// ========================================

import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { verifyPassword } from '@/lib/auth/password';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { createDonorSession } from '@/lib/donor/session';
import { donorLoginSchema } from '@/lib/donor/schemas';

export const dynamic = 'force-dynamic';

// A syntactically valid hash that matches nothing. Used so that an unknown email
// costs the same as a known one.
const DUMMY_HASH = '$2b$12$0000000000000000000000000000000000000000000000000000';

const GENERIC = 'The email address or password is not correct.';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const ipKey = ip ? `donor-ip:${ip}` : null;

  if (ipKey) {
    const blockedFor = blockedForMinutes(ipKey);
    if (blockedFor > 0) return fail(blockMessage(blockedFor), 429);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = donorLoginSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { email, password, remember } = parsed.data;

  const emailKey = `donor-email:${email}`;
  const emailBlockedFor = blockedForMinutes(emailKey);
  if (emailBlockedFor > 0) return fail(blockMessage(emailBlockedFor), 429);

  try {
    const donor = await prisma.donorAccount.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        isActive: true,
        sessionVersion: true,
        emailVerifiedAt: true,
      },
    });

    const passwordMatches = await verifyPassword(password, donor?.passwordHash ?? DUMMY_HASH);

    if (!donor || !passwordMatches) {
      let minutes = recordFailure(emailKey);
      if (ipKey) minutes = Math.max(minutes, recordFailure(ipKey));

      return fail(minutes > 0 ? blockMessage(minutes) : GENERIC, minutes > 0 ? 429 : 401);
    }

    if (!donor.isActive) {
      return fail(
        'This account has been switched off. Please contact the office if you think that is a mistake.',
        403,
      );
    }

    // ---------- the password is right, but the address is not proven ----------
    // No cookie is created. The donor is handed to the code page, which can send
    // a fresh code and finishes the sign-in as soon as the code is typed.
    if (!donor.emailVerifiedAt) {
      return ok(
        { needsVerification: true, email: donor.email, name: donor.name },
        200,
        'Please confirm your email address before signing in. We have sent you a code.',
      );
    }

    await prisma.donorAccount
      .update({ where: { id: donor.id }, data: { lastLoginAt: new Date() } })
      .catch(() => undefined);

    await createDonorSession(donor, Boolean(remember));

    recordSuccess(emailKey);
    if (ipKey) recordSuccess(ipKey);

    return ok({ name: donor.name, email: donor.email }, 200, `Welcome back, ${donor.name}.`);
  } catch (error) {
    console.error('[donor-login] could not sign in:', error);
    recordFailure(emailKey);
    return fail('Could not sign in right now. Please try again shortly.', 500);
  }
}
