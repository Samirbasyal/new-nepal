// ========================================
// API - SEND THE CONFIRMATION CODE AGAIN
// ========================================
// Address: POST /api/donor/resend-verification
// Body:    { email }
//
// WHY IT IS NEEDED
//   A code expires in 15 minutes, and an email can land in a spam folder. Without
//   this, a donor who mistyped the code three times would be stuck for good.
//
// WHAT IT NEVER REVEALS
//   Whether that address has an account. Every request gets the same answer, so
//   the route cannot be used to find out who has donated to the club.
//
// SPAM GUARD
//   A new code is only created when the last one is at least a minute old. Asking
//   twice in a row therefore does nothing (and sends no second email), which
//   keeps one person from filling an inbox - or the club's mail quota.
// ========================================

import { blockMessage, blockedForMinutes, clientKey } from '@/lib/auth/rate-limit';
import { ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { isEmailConfigured } from '@/lib/email/mailer';
import { issueDonorToken } from '@/lib/donor/tokens';
import { sendDonorVerificationEmail } from '@/lib/donor/mail';

export const dynamic = 'force-dynamic';

const SAME_ANSWER =
  'If that address has an unconfirmed account, a new code is on its way. Please check your inbox and your spam folder.';

export async function POST(request: Request) {
  // This route deliberately answers the same thing when the database is missing,
  // when the address is unknown, and when the mail server refuses - an honest
  // "we tried" is all that can be promised here.
  if (!isDatabaseConfigured()) return ok({ sent: false }, 200, SAME_ANSWER);

  const ip = clientKey(request);
  const ipKey = `donor-resend:${ip ?? 'local'}`;

  const blockedFor = blockedForMinutes(ipKey);
  if (blockedFor > 0) return fail429(blockedFor);

  const body = (await readJson(request)) as { email?: string } | null;
  const email = String(body?.email ?? '').trim().toLowerCase();

  if (!email) return ok({ sent: false }, 200, SAME_ANSWER);

  if (!isEmailConfigured()) {
    return ok(
      { sent: false, mailConfigured: false },
      200,
      'This website has no mail server configured, so no code can be sent. Please contact the office.',
    );
  }

  try {
    const donor = await prisma.donorAccount.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, emailVerifiedAt: true, isActive: true },
    });

    if (!donor || !donor.isActive || donor.emailVerifiedAt) {
      return ok({ sent: false }, 200, SAME_ANSWER);
    }

    // ---------- one code a minute ----------
    const last = await prisma.donorToken.findFirst({
      where: { donorAccountId: donor.id, purpose: 'EMAIL_VERIFY' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (last && Date.now() - last.createdAt.getTime() < 60_000) {
      return ok({ sent: false, tooSoon: true }, 200, SAME_ANSWER);
    }

    const { raw, expiresAt } = await issueDonorToken(donor.id, 'EMAIL_VERIFY');

    const sent = await sendDonorVerificationEmail({
      to: donor.email,
      name: donor.name,
      code: raw,
      minutes: Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000)),
    });

    return ok({ sent }, 200, SAME_ANSWER);
  } catch (error) {
    console.error('[donor-resend] could not send:', error);
    return ok({ sent: false }, 200, SAME_ANSWER);
  }
}

/** Small local helper so the 429 answer looks like every other one. */
function fail429(minutes: number) {
  return new Response(
    JSON.stringify({ ok: false, error: blockMessage(minutes) }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  );
}
