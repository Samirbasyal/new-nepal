// ========================================
// API - DONOR FORGOT PASSWORD
// ========================================
// Address: POST /api/donor/forgot-password
// Body:    { email }
//
// THE ONE RULE
//   The answer never says whether that address has an account. Somebody could
//   otherwise type a list of addresses into this form and learn who supports the
//   club - which is private information.
//
// WHAT IT SENDS
//   A link containing a long random token, valid for 60 minutes and usable once
//   (lib/donor/tokens.ts). The password itself is NEVER emailed - the donor
//   chooses a new one on the website.
//
// WHEN THERE IS NO MAIL SERVER
//   It says so plainly. "Check your inbox" on a site that cannot send mail would
//   leave the donor waiting for a message that will never arrive.
// ========================================

import { blockMessage, blockedForMinutes, clientKey } from '@/lib/auth/rate-limit';
import { ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { isEmailConfigured } from '@/lib/email/mailer';
import { issueDonorToken } from '@/lib/donor/tokens';
import { sendDonorResetEmail } from '@/lib/donor/mail';

export const dynamic = 'force-dynamic';

const SAME_ANSWER =
  'If an account uses that email address, a link to choose a new password is on its way. It works once and expires in one hour.';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return ok({ sent: false }, 200, SAME_ANSWER);

  const ip = clientKey(request);
  const ipKey = `donor-forgot:${ip ?? 'local'}`;

  const blockedFor = blockedForMinutes(ipKey);
  if (blockedFor > 0) {
    return new Response(JSON.stringify({ ok: false, error: blockMessage(blockedFor) }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await readJson(request)) as { email?: string } | null;
  const email = String(body?.email ?? '').trim().toLowerCase();

  if (!email) {
    return ok({ sent: false }, 200, SAME_ANSWER);
  }

  if (!isEmailConfigured()) {
    return ok(
      { sent: false, mailConfigured: false },
      200,
      'This website has no mail server configured, so a reset link cannot be sent. Please contact the office and they will help you.',
    );
  }

  try {
    const donor = await prisma.donorAccount.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!donor || !donor.isActive) {
      return ok({ sent: false }, 200, SAME_ANSWER);
    }

    // ---------- no more than one link every two minutes ----------
    const last = await prisma.donorToken.findFirst({
      where: { donorAccountId: donor.id, purpose: 'PASSWORD_RESET' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (last && Date.now() - last.createdAt.getTime() < 120_000) {
      return ok({ sent: false, tooSoon: true }, 200, SAME_ANSWER);
    }

    const { raw, expiresAt } = await issueDonorToken(donor.id, 'PASSWORD_RESET');

    const sent = await sendDonorResetEmail({
      to: donor.email,
      name: donor.name,
      token: raw,
      minutes: Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000)),
    });

    return ok({ sent }, 200, SAME_ANSWER);
  } catch (error) {
    console.error('[donor-forgot] could not send:', error);
    return ok({ sent: false }, 200, SAME_ANSWER);
  }
}
