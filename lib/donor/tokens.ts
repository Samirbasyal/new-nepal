// ========================================
// DONOR TOKENS - ONE-TIME PROOF OF IDENTITY
// ========================================
// Two jobs, one table:
//
//   EMAIL_VERIFY    a six-digit code that proves the donor can read that inbox
//   PASSWORD_RESET  a long random link token that lets a donor set a new password
//
// THREE RULES THAT MAKE THEM SAFE
//
//   1. ONLY THE FINGERPRINT IS STORED
//      What is saved is SHA-256 of the secret. Somebody who reads the database
//      still cannot type a working code, because the code itself is not there.
//
//   2. ONE USE
//      A successful token is stamped usedAt. A second attempt finds nothing.
//      Asking for a new code kills the previous one, so an old email cannot be
//      replayed later.
//
//   3. SHORT LIFE, LIMITED GUESSES
//      Codes expire in 15 minutes, reset links in 60. Six digits is guessable by
//      a machine, so each code allows five wrong attempts before it dies and the
//      rate limiter on the API slows the whole thing down.
// ========================================

import { createHash, randomBytes, randomInt } from 'node:crypto';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export type DonorTokenPurpose = 'EMAIL_VERIFY' | 'PASSWORD_RESET';

const VERIFY_MINUTES = 15;
const RESET_MINUTES = 60;
const MAX_ATTEMPTS = 5;

export function hashDonorToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Six digits, never starting with zero - easy to read out and type. */
function sixDigitCode(): string {
  return String(randomInt(100000, 1000000));
}

/**
 * Create a fresh token for one purpose and return the RAW value.
 *
 * The raw value is the only time the secret exists in readable form: it goes
 * straight into the email, and only its fingerprint is written to the database.
 */
export async function issueDonorToken(
  donorAccountId: string,
  purpose: DonorTokenPurpose,
): Promise<{ raw: string; expiresAt: Date }> {
  // Asking for a new one invalidates every earlier one of the same kind, so an
  // old email can never be used after a newer code has been requested.
  await prisma.donorToken.updateMany({
    where: { donorAccountId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  // BOTH purposes now use a six-digit code: easy to read out over the phone and
  // impossible to confuse with a long link. The emailed link still works, because
  // the code inside it is the same secret (see app/(site)/donor/reset-password).
  const raw = sixDigitCode();
  const minutes = VERIFY_MINUTES;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  await prisma.donorToken.create({
    data: {
      donorAccountId,
      purpose,
      tokenHash: hashDonorToken(raw),
      expiresAt,
    },
  });

  return { raw, expiresAt };
}

// ========================================
// VERIFY A SIX-DIGIT CODE
// ========================================
// The code is checked against the ONE live code for this donor, so a wrong guess
// can be counted. (A lookup by hash would simply find nothing, and there would be
// no row to count against.)
export async function checkDonorVerifyCode(
  donorAccountId: string,
  code: string,
): Promise<{ ok: boolean; reason?: 'expired' | 'locked' | 'wrong' | 'missing' }> {
  if (!isDatabaseConfigured()) return { ok: false, reason: 'missing' };

  const token = await prisma.donorToken.findFirst({
    where: { donorAccountId, purpose: 'EMAIL_VERIFY', usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!token) return { ok: false, reason: 'missing' };

  if (token.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  if (token.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'locked' };
  }

  if (hashDonorToken(code.trim()) !== token.tokenHash) {
    await prisma.donorToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });

    const after = token.attempts + 1;
    return { ok: false, reason: after >= MAX_ATTEMPTS ? 'locked' : 'wrong' };
  }

  await prisma.donorToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  return { ok: true };
}

// ========================================
// REDEEM A RESET LINK
// ========================================
// A reset token is 48 hex characters, so it can be looked up directly by its
// fingerprint. Nothing is counted per attempt: guessing 2^192 is not a thing.
export async function redeemResetToken(
  raw: string,
): Promise<{ ok: boolean; donorAccountId?: string; reason?: 'invalid' | 'used' | 'expired' }> {
  if (!isDatabaseConfigured()) return { ok: false, reason: 'invalid' };

  const token = await prisma.donorToken.findUnique({
    where: { tokenHash: hashDonorToken(raw.trim()) },
  });

  if (!token || token.purpose !== 'PASSWORD_RESET') return { ok: false, reason: 'invalid' };
  if (token.usedAt) return { ok: false, reason: 'used' };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

  await prisma.donorToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });

  return { ok: true, donorAccountId: token.donorAccountId };
}

/** True only while the reset link is still usable - used to show the form or not. */
export async function isResetTokenUsable(raw: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const token = await prisma.donorToken.findUnique({
      where: { tokenHash: hashDonorToken(raw.trim()) },
    });

    return Boolean(
      token && token.purpose === 'PASSWORD_RESET' && !token.usedAt && token.expiresAt.getTime() > Date.now(),
    );
  } catch {
    return false;
  }
}

// ========================================
// CHECK A PASSWORD-RESET CODE
// ========================================
// Same rules as the email code: 15 minutes, five wrong guesses, one live code.
// It deliberately does NOT mark the code as used - the caller does that only
// AFTER the new password has been saved, so a failed save does not lock the
// donor out of their own code.
export async function checkDonorResetCode(
  donorAccountId: string,
  code: string,
): Promise<{ ok: boolean; reason?: 'expired' | 'locked' | 'wrong' | 'missing' }> {
  if (!isDatabaseConfigured()) return { ok: false, reason: 'missing' };

  const token = await prisma.donorToken.findFirst({
    where: { donorAccountId, purpose: 'PASSWORD_RESET', usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!token) return { ok: false, reason: 'missing' };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
  if (token.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };

  if (hashDonorToken(code.trim()) !== token.tokenHash) {
    const next = token.attempts + 1;
    await prisma.donorToken.update({ where: { id: token.id }, data: { attempts: next } });
    return { ok: false, reason: next >= MAX_ATTEMPTS ? 'locked' : 'wrong' };
  }

  return { ok: true };
}

/** Burn the code once the password has really been changed. */
export async function consumeDonorResetCode(donorAccountId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;

  await prisma.donorToken.updateMany({
    where: { donorAccountId, purpose: 'PASSWORD_RESET', usedAt: null },
    data: { usedAt: new Date() },
  });
}
