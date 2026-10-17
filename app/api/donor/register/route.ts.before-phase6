// ========================================
// API - CREATE A DONOR ACCOUNT
// ========================================
// Address: POST /api/donor/register   (public)
// Body:    { name, email, phone?, password, confirmPassword? }
//
// WHAT THIS MAKES
//   A row in donor_accounts - NOT a row in users. A donor is not a member: they
//   pay no monthly NPR 20, take no loan, and must never appear in the member
//   register or the fund calculations.
//
// WHY A DONOR WANTS ONE
//   So they can sign in later and see every donation they made: the amount, the
//   cause, the date and whether the office has confirmed it yet.
//
// SECURITY
//   - The password is stored only as a bcrypt hash (lib/auth/password.ts).
//   - The email is the username, so it must be unique. A second sign-up with the
//     same address is refused with a sentence that tells the person to sign in.
//   - Rate limited per IP so nobody can create accounts in a loop.
//   - The honeypot field catches the simplest bots.
//   - The account created here has no power anywhere else on the website: it
//     cannot open the member panel, the admin panel, or any guarded API.
// ========================================

import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { hashPassword } from '@/lib/auth/password';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { createDonorSession } from '@/lib/donor/session';
import { donorRegisterSchema } from '@/lib/donor/schemas';

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

  // ---------- Honeypot ----------
  if ((data.website ?? '').trim() !== '') {
    recordFailure(key);
    return fail('The form could not be sent. Please try again.', 422);
  }

  try {
    // ---------- Is this email already used? ----------
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

    // ---------- Create it ----------
    const donor = await prisma.donorAccount.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: await hashPassword(data.password),
      },
      select: { id: true, name: true, email: true, sessionVersion: true },
    });

    // Signed in straight away: making somebody type the password they chose ten
    // seconds ago is a needless obstacle.
    await createDonorSession(donor, false);

    recordSuccess(key);

    return ok(
      { name: donor.name, email: donor.email },
      201,
      'Your donor account is ready. You are signed in.',
    );
  } catch (error) {
    // A race between two identical sign-ups: the unique index rejects the second.
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
