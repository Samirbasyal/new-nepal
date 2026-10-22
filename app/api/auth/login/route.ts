// ========================================
// API - LOGIN (MEMBER AND ADMIN)
// ========================================
// Address: POST /api/auth/login
//
// THIS FILE CONTROLS LOGGING IN FOR BOTH PANELS.
//
// THE STEPS
//   1. Validate the typed values.
//   2. Look the account up by email.
//   3. Compare the typed password with the stored bcrypt hash.
//   4. Refuse deactivated accounts.
//   5. Refuse non-administrators on the admin login page.
//   6. Create a signed session cookie and record the login.
//
// SECURITY DETAILS
//   - The same "email or password is incorrect" message is used whether the
//     email exists or not, so an attacker cannot discover which emails are
//     registered.
//   - Failed attempts are counted to slow down password guessing.
// ========================================

import { getCurrentUser } from '@/lib/auth/guards';
import { createSession } from '@/lib/auth/session';
import { clearMfaChallengeCookie, setMfaChallengeCookie, signMfaChallenge } from '@/lib/auth/mfa';
import { verifyPassword } from '@/lib/auth/password';
import { attemptsLeft, blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { writeActivity } from '@/lib/audit';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validation/schemas';
import { isAdminRole, normalizeRole } from '@/lib/constants';

// A dummy hash so that a request for an unknown email still takes the same
// amount of time as a request for a known email (timing-attack protection).
// It is a real bcrypt hash of a fixed nonsense password and is never matched
// against a real account.
const DUMMY_HASH = '$2b$12$KPSpFdo1MK4RDxfIJgFe5e4VD4H/QPYu5lGuLy04akCHwV/LZu55e';

export async function POST(request: Request) {
  // ---------- 0. Is the database ready? ----------
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  // ---------- 1. Rate limiting ----------
  // clientKey() returns null while developing locally (no proxy header), in
  // which case we skip the machine-wide limit and only count per email below.
  const ip = clientKey(request);
  const ipKey = ip ? `ip:${ip}` : null;

  if (ipKey) {
    const ipBlockedFor = blockedForMinutes(ipKey);
    if (ipBlockedFor > 0) {
      return fail(blockMessage(ipBlockedFor), 429);
    }
  }

  // ---------- 2. Validate the input ----------
  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { email, password, remember, portal } = parsed.data;

  const emailBlockedFor = blockedForMinutes(`email:${email}`);
  if (emailBlockedFor > 0) {
    return fail(blockMessage(emailBlockedFor), 429);
  }

  // ---------- 3. Find the account ----------
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  // To keep the response time the same for known and unknown emails we always
  // run a password check, even when no account was found.
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    const emailKey = `email:${email}`;

    // Count the failure and find out whether this attempt has now hit the limit.
    let blockedMinutes = recordFailure(emailKey);
    if (ipKey) {
      blockedMinutes = Math.max(blockedMinutes, recordFailure(ipKey));
    }

    // If the limit was just reached, say so clearly. Otherwise a visitor keeps
    // retyping the correct password and cannot work out why it is refused.
    if (blockedMinutes > 0) {
      return fail(blockMessage(blockedMinutes), 429);
    }

    // Deliberately vague: never reveal which part was wrong.
    const left = attemptsLeft(emailKey);
    return fail(
      left <= 2
        ? `The email address or password is incorrect. ${left} attempt${
            left === 1 ? '' : 's'
          } left before sign-in is paused.`
        : 'The email address or password is incorrect.',
      401,
    );
  }

  // ---------- 4. Is the account switched on? ----------
  if (!user.isActive) {
    return fail(
      'This account has been deactivated. Please contact the organization office.',
      403,
    );
  }

  // ---------- 4b. MEMBER PAGE: membership and email checks ----------
  // These run only on the member sign-in page. An administrator whose
  // membership row happens to look odd must still be able to open the Admin
  // Panel, otherwise nobody could ever repair the problem.
  if (portal === 'member' && !isAdminRole(user.role)) {
    const membership = user.profile?.status ?? 'ACTIVE';

    if (membership === 'SUSPENDED' || membership === 'INACTIVE') {
      return fail(
        membership === 'SUSPENDED'
          ? 'Your membership is currently suspended. Please contact the organization office.'
          : 'Your membership is not active yet. Please contact the organization office.',
        403,
      );
    }

    // The email address must be proven before the member panel opens. Saying so
    // here is much kinder than letting them in and refusing every single thing
    // they then try to do.
    if (!user.emailVerifiedAt) {
      return fail(
        'Please verify your email address first. Open the "Verify email" page to type the ' +
          'code we emailed you, or ask for a new link.',
        403,
        { email: 'This email address has not been verified yet.' },
      );
    }
  }

  // ---------- 5. ADMIN LOGIN PAGE: administrators only ----------
  // isAdminRole() accepts SUPER_ADMIN, FINANCE_ADMIN and ADMIN, so a Finance
  // Administrator or a Super Administrator can sign in here too.
  if (portal === 'admin' && !isAdminRole(user.role)) {
    return fail(
      'This account does not have administrator access. Please use the member sign-in page.',
      403,
    );
  }

  // ---------- 5b. TWO-STEP VERIFICATION ----------
  // An administrator who has turned this on gets NO session yet. The password was
  // correct, so we remember that fact in a short-lived signed challenge cookie and
  // ask for the 6-digit code (app/api/auth/mfa/route.ts finishes the job).
  //
  // This applies whatever page they used to sign in, not just the admin page: an
  // administrator signing in through the member portal would otherwise end up
  // with a session that carries the admin role, which would be the same door.
  if (isAdminRole(user.role) && user.twoFactorEnabledAt && user.twoFactorSecret) {
    const challenge = await signMfaChallenge({
      userId: user.id,
      portal: portal === 'admin' ? 'admin' : 'member',
      remember: remember === true,
    });

    await setMfaChallengeCookie(challenge);

    return ok(
      { mfaRequired: true },
      200,
      'Enter the 6-digit code from your authenticator app to finish signing in.',
    );
  }

  // No two-step verification on this account: make sure an old half-finished
  // challenge from an earlier attempt cannot linger in the browser.
  await clearMfaChallengeCookie();

  // ---------- 6. Create the session ----------
  await createSession(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      // The real role is stored, so Super Admin / Finance Admin keep their
      // extra permissions for the life of the session.
      role: normalizeRole(user.role),
      // The session counter goes into the cookie. If the password is changed
      // later this number goes up and this cookie stops working at once.
      sessionVersion: user.sessionVersion,
      // Recorded so the guards do not have to ask the database again on every
      // single request.
      emailVerified: isAdminRole(user.role) || Boolean(user.emailVerifiedAt),
    },
    remember,
  );

  // ---------- 7. Housekeeping ----------
  recordSuccess(`email:${email}`);
  if (ipKey) recordSuccess(ipKey);

  await prisma.user
    .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    .catch(() => undefined); // never block a login because of a timestamp

  await writeActivity({
    actorId: user.id,
    actorName: user.name,
    action: 'LOGIN',
    entity: portal === 'admin' ? 'Admin Panel' : 'Member Panel',
    detail: user.email,
  });

  return ok(
    {
      id: user.id,
      name: user.name,
      role: normalizeRole(user.role),
      redirectTo:
        isAdminRole(user.role) && portal === 'admin' ? '/admin/dashboard' : '/member/dashboard',
    },
    200,
    `Welcome back, ${user.name}.`,
  );
}

// Small helper used by pages that want to know if somebody is already signed in.
export async function GET() {
  const user = await getCurrentUser();
  return ok({ user });
}
