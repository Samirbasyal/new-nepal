// ========================================
// API - CREATE A DONOR ACCOUNT
// ========================================
// Address: POST /api/donor/register   (public)
// Body:    { name, email, phone?, password, confirmPassword? }
//
// THIS IS THE DOOR TO DONATING
//   Since part 6 the donation journey starts here: a visitor who clicks Donate
//   without an account is sent to the sign-in / register page first. So this
//   route is not a side feature - it is the way in.
//
// WHAT IT MAKES
//   A row in donor_accounts - NOT a row in users. A donor is not a member: they
//   pay no monthly NPR 20, take no loan, and never appear in the member register.
//
// THE EMAIL HAS TO BE PROVEN
//   When the site has a mail server, the account is created UNVERIFIED, a
//   six-digit code is emailed, and the donor cannot start a donation until they
//   type it (see requireDonor in lib/donor/session.ts).
//
//   When no mail server is configured nothing can be sent, and requiring a code
//   would simply lock every donor out of the club's donation page. In that case
//   the account is activated immediately and the response says so - the donor is
//   told the truth instead of being asked to check an inbox that will stay empty.
//   Configure SMTP (see .env.example) and the code step switches on by itself.
//
// SECURITY
//   - The password is stored only as a bcrypt hash.
//   - The email is the username, so it must be unique; a second sign-up is
//     refused with a sentence that points to the sign-in page.
//   - Rate limited per IP, plus a honeypot field.
//   - This account has no power anywhere else: it cannot open the member panel,
//     the admin panel, or any API guarded by those roles.
// ========================================

import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { hashPassword } from '@/lib/auth/password';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { isEmailConfigured } from '@/lib/email/mailer';
import { createDonorSession } from '@/lib/donor/session';
import { donorRegisterSchema } from '@/lib/donor/schemas';
import { issueDonorToken } from '@/lib/donor/tokens';
import { sendDonorVerificationEmail } from '@/lib/donor/mail';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const key = `donor-register:${ip ?? 'local'}`;

  const blockedFor = blockedForMinutes(key);
  if (blockedFor > 0) {
    return fail(blockMessage(blockedFor), 429);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = donorRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const data = parsed.data;

  if ((data.website ?? '').trim() !== '') {
    recordFailure(key);
    return fail('The form could not be sent. Please try again.', 422);
  }

  try {
    const existing = await prisma.donorAccount.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existing) {
      return fail(
        'An account already exists for this email address. Please sign in instead.',
        409,
        { email: 'This email already has an account.' },
      );
    }

    const mailReady = isEmailConfigured();

    const donor = await prisma.donorAccount.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: await hashPassword(data.password),
        // No mail server means no code can be sent, so the account is usable at
        // once. With a mail server this stays null until the code is typed.
        emailVerifiedAt: mailReady ? null : new Date(),
      },
      select: { id: true, name: true, email: true, sessionVersion: true, emailVerifiedAt: true },
    });

    recordSuccess(key);

    // ---------- the account is usable straight away ----------
    if (!mailReady) {
      await createDonorSession(donor, false);

      return ok(
        {
          needsVerification: false,
          email: donor.email,
          name: donor.name,
          note: 'Email confirmation is switched off because this website has no mail server configured.',
        },
        201,
        'Your donor account is ready. You are signed in.',
      );
    }

    // ---------- send the code ----------
    const { raw, expiresAt } = await issueDonorToken(donor.id, 'EMAIL_VERIFY');

    const sent = await sendDonorVerificationEmail({
      to: donor.email,
      name: donor.name,
      code: raw,
      minutes: Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000)),
    });

    return ok(
      {
        needsVerification: true,
        email: donor.email,
        name: donor.name,
        emailSent: sent,
      },
      201,
      sent
        ? 'Your account is created. Check your email for the 6-digit code.'
        : 'Your account is created, but the email could not be sent. Please use "Send the code again", or contact the office.',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/unique|already exists/i.test(message)) {
      return fail(
        'An account already exists for this email address. Please sign in instead.',
        409,
        { email: 'This email already has an account.' },
      );
    }

    console.error('[donor-register] could not create the account:', error);
    recordFailure(key);
    return fail('The account could not be created right now. Please try again shortly.', 500);
  }
}
