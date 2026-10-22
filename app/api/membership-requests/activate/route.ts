// ========================================
// API - ACTIVATE AN APPROVED MEMBERSHIP
// ========================================
// Address: POST /api/membership-requests/activate
//
// WHO MAY CALL IT
//   Anybody holding a valid activation link. The link itself is the proof: it was
//   created on approval, it is emailed only to the address on the application,
//   it expires after seven days and it works once.
//
// WHAT IT DOES
//   Checks the link, then - and only then - creates the member account:
//   User (role MEMBER, email already proven) + MemberProfile (ACTIVE) in one
//   transaction, and burns the link.
//
// WHY THE PASSWORD IS CHECKED HERE AS WELL AS IN THE FORM
//   The browser check is a courtesy. This one is the rule: at least 8 characters,
//   one letter and one number, hashed with bcrypt before it touches the database.
// ========================================

import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured } from '@/lib/prisma';
import { clientKey } from '@/lib/auth/rate-limit';
import { activationSchema } from '@/lib/membership/schemas';
import { activateMembership } from '@/lib/membership/service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const body = await readJson(request);
  if (!body) {
    return fail('The form could not be read. Please open the link from your email again.', 400);
  }

  const parsed = activationSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const result = await activateMembership({
    token: parsed.data.token,
    password: parsed.data.password,
    requestIp: clientKey(request),
  });

  if (!result.ok) {
    // 410 Gone for an expired or already-used link: it existed, it is finished.
    // 400 for a link that was never valid.
    const status = result.reason === 'expired' || result.reason === 'already-activated' ? 410 : 400;
    return fail(result.message, status);
  }

  return ok(
    { name: result.name, email: result.email, redirectTo: '/member/portal?tab=login&notice=activated' },
    200,
    'Your account is ready. Please sign in with the password you just chose.',
  );
}
