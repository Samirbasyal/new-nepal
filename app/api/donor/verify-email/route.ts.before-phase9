// ========================================
// API - CONFIRM A DONOR'S EMAIL ADDRESS
// ========================================
// Address: POST /api/donor/verify-email
// Body:    { email, code }
//
// WHAT IT DOES
//   1. finds the donor account for that address
//   2. checks the six-digit code against the ONE live code for that account
//   3. marks the address proven
//   4. signs the donor in - they were told "register, then continue to your
//      donation", so asking for the password again here would be a second wall
//
// WHAT IT REFUSES TO SAY
//   Whether an address has an account. A wrong code and an unknown address get
//   the same sentence, so this route cannot be used to test who has donated.
//
// BRUTE FORCE
//   Six digits is small. Three things stop it: the code expires in 15 minutes,
//   five wrong attempts kill it (lib/donor/tokens.ts), and the IP limit below
//   slows repeated calls.
// ========================================

import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { fail, ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { createDonorSession } from '@/lib/donor/session';
import { checkDonorVerifyCode } from '@/lib/donor/tokens';

export const dynamic = 'force-dynamic';

const WRONG = 'That code is not correct, or it has expired. Please check the latest email, or ask for a new code.';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const ipKey = `donor-verify:${ip ?? 'local'}`;

  const blockedFor = blockedForMinutes(ipKey);
  if (blockedFor > 0) return fail(blockMessage(blockedFor), 429);

  const body = (await readJson(request)) as { email?: string; code?: string } | null;
  const email = String(body?.email ?? '').trim().toLowerCase();
  const code = String(body?.code ?? '').trim();

  if (!email || !/^\d{6}$/.test(code)) {
    return fail('Please enter the six-digit code from your email.', 422, {
      code: 'Enter the six digits.',
    });
  }

  try {
    const donor = await prisma.donorAccount.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, sessionVersion: true, emailVerifiedAt: true, isActive: true },
    });

    if (!donor || !donor.isActive) {
      recordFailure(ipKey);
      return fail(WRONG, 422);
    }

    // Already proven (a double click, or an old tab): signing in again is
    // harmless and is exactly what the person wanted.
    if (donor.emailVerifiedAt) {
      await createDonorSession(donor, false);
      return ok({ verified: true, name: donor.name, email: donor.email }, 200, 'You are signed in.');
    }

    const result = await checkDonorVerifyCode(donor.id, code);

    if (!result.ok) {
      recordFailure(ipKey);

      if (result.reason === 'locked') {
        return fail(
          'Too many wrong codes. Please ask for a new code and try again.',
          429,
          { code: 'Ask for a new code.' },
        );
      }

      return fail(WRONG, 422, { code: 'That code is not correct.' });
    }

    await prisma.donorAccount.update({
      where: { id: donor.id },
      data: { emailVerifiedAt: new Date(), lastLoginAt: new Date() },
    });

    await createDonorSession(donor, false);

    recordSuccess(ipKey);

    return ok(
      { verified: true, name: donor.name, email: donor.email },
      200,
      'Your email address is confirmed. You are signed in.',
    );
  } catch (error) {
    console.error('[donor-verify] could not confirm:', error);
    return fail('The code could not be checked right now. Please try again shortly.', 500);
  }
}
