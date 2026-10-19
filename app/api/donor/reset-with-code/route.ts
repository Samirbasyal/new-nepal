// ========================================
// API - SET A NEW PASSWORD WITH A SIX-DIGIT CODE
// ========================================
// Address: POST /api/donor/reset-with-code
// Body:    { email, code, password, confirmPassword }
//
// THE WHOLE FLOW IN ONE REQUEST
//   1. the email address finds the account
//   2. the six-digit code is checked (15 minutes, five wrong guesses)
//   3. the new password is validated and hashed
//   4. the code is burned only AFTER the password is saved
//
// WHAT IS NEVER SAID
//   Whether the address has an account. A wrong email and a wrong code get the
//   same answer, so this form cannot be used to discover who donates.
// ========================================

import { fail, ok, readJson } from '@/lib/api/http';
import { blockMessage, blockedForMinutes, clientKey } from '@/lib/auth/rate-limit';
import { hashPassword, checkPasswordStrength } from '@/lib/auth/password';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { checkDonorResetCode, consumeDonorResetCode } from '@/lib/donor/tokens';

export const dynamic = 'force-dynamic';

const SAME_ANSWER = 'That code is not correct, or it has expired. Please request a new one.';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return fail('The database is not set up yet.', 503);

  const ipKey = `donor-reset-code:${clientKey(request) ?? 'local'}`;
  const blockedFor = blockedForMinutes(ipKey);
  if (blockedFor > 0) {
    return fail(blockMessage(blockedFor), 429);
  }

  const body = (await readJson(request)) as
    | { email?: string; code?: string; password?: string; confirmPassword?: string }
    | null;

  const email = String(body?.email ?? '').trim().toLowerCase();
  const code = String(body?.code ?? '').replace(/\D/g, '');
  const password = String(body?.password ?? '');
  const confirmPassword = String(body?.confirmPassword ?? password);

  if (!/^\d{6}$/.test(code)) {
    return fail('Please type the six-digit code from the email.', 422, {
      code: 'The code is six digits.',
    });
  }

  const weak = checkPasswordStrength(password);
  if (weak.length > 0) {
    return fail(weak[0], 422, { password: weak[0] });
  }

  if (password !== confirmPassword) {
    return fail('The two passwords do not match.', 422, {
      confirmPassword: 'The two passwords do not match.',
    });
  }

  const donor = await prisma.donorAccount.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });

  // Same sentence for "no such account" and "wrong code".
  if (!donor || !donor.isActive) return fail(SAME_ANSWER, 422, { code: SAME_ANSWER });

  const checked = await checkDonorResetCode(donor.id, code);

  if (!checked.ok) {
    if (checked.reason === 'locked') {
      return fail('Too many wrong codes. Please request a new code.', 429, {
        code: 'Too many attempts.',
      });
    }
    if (checked.reason === 'expired' || checked.reason === 'missing') {
      return fail('That code has expired. Please request a new one.', 422, {
        code: 'This code has expired.',
      });
    }
    return fail(SAME_ANSWER, 422, { code: 'That code is not correct.' });
  }

  await prisma.donorAccount.update({
    where: { id: donor.id },
    data: { passwordHash: await hashPassword(password) },
  });

  // Only now is the code dead.
  await consumeDonorResetCode(donor.id);

  return ok({}, 200, 'Your password has been changed. You can sign in with the new one.');
}
