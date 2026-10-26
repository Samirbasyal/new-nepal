// ========================================
// AUTHENTICATION - EMAIL VERIFICATION AND PASSWORD RESET TOKENS
// ========================================
// This file creates, sends and checks the two secrets a member receives by
// email:
//     EMAIL_VERIFY   -> "prove this email address is yours"
//     PASSWORD_RESET -> "choose a new password"
//
// HOW A TOKEN IS KEPT SAFE
//   1. We create a long random text (the "raw" token). That is what goes in the
//      email link. It is never stored anywhere.
//   2. We store only its SHA-256 fingerprint (tokenHash). Reading the whole
//      database therefore does not give anybody a usable link.
//   3. A 6 digit code is created at the same time, also stored only as a
//      fingerprint, so a member can type it on a phone instead of clicking.
//   4. Every token EXPIRES and can be USED ONCE.
//   5. Typing a wrong code too many times throws the token away, so nobody can
//      sit there guessing 000000, 000001, 000002...
//
// WHY THE RAW TOKEN IS NEVER RETURNED TO THE BROWSER
//   Even while developing, the link is printed in the SERVER TERMINAL only.
//   Showing it on the page would prove nothing - anybody who can open the page
//   could read it - so it is not done at all.
// ========================================

import { createHash, randomBytes, randomInt } from 'node:crypto';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { writeActivity } from '@/lib/audit';
import { buildPasswordResetEmail, buildVerificationEmail } from '@/lib/email/templates';
import { sendMail, type MailResult } from '@/lib/email/mailer';

export const VERIFY_PURPOSE = 'EMAIL_VERIFY';
export const RESET_PURPOSE = 'PASSWORD_RESET';

// Email verification: a full day, because people read their email later.
export const VERIFY_MINUTES = 60 * 24;
// Password reset: short, because this one can change a password.
export const RESET_MINUTES = 30;

// How many wrong codes are allowed before the token is thrown away.
const MAX_CODE_ATTEMPTS = 5;

// ========================================
// THE WEBSITE ADDRESS USED IN EMAILS
// ========================================
export function siteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  return 'http://localhost:3000';
}

/**
 * The address the person actually reached us on, taken from the request itself.
 *
 * A link built from NEXT_PUBLIC_SITE_URL is only right when that setting is right,
 * and it very often is not - it says http://localhost:3000 while somebody is
 * reading the mail on a phone, where "localhost" means the phone and the page can
 * never open. Reading the host from the request means the link always points back
 * at the same place the office is working in: the real domain in production, the
 * preview address on a preview deployment, localhost while developing.
 */
export function requestOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = (forwardedHost ?? request.headers.get('host') ?? '').split(',')[0].trim();

  if (!host) return siteUrl();

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  const proto =
    forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${proto}://${host}`;
}

export function verifyEmailLink(rawToken: string, base: string = siteUrl()): string {
  return `${base}/member/verify-email?token=${encodeURIComponent(rawToken)}`;
}

export function resetPasswordLink(rawToken: string, base: string = siteUrl()): string {
  return `${base}/member/reset-password?token=${encodeURIComponent(rawToken)}`;
}

// ========================================
// SMALL CRYPTO HELPERS
// ========================================
/** The fingerprint we store. The raw value is never written to the database. */
export function hashSecret(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function newRawToken(): string {
  // 32 random bytes = 256 bits. Guessing this is not realistic.
  return randomBytes(32).toString('hex');
}

function newCode(): string {
  // Always 6 digits, so "42" becomes "000042".
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

// ========================================
// HOW OFTEN MAY WE SEND TO THE SAME PERSON?
// ========================================
// Stops somebody using the "resend" button as a free way to flood a member's
// inbox, and stops an attacker hammering the endpoint to find valid addresses.
//
// HONEST LIMITATION: these counters live in the memory of the running server
// (the same honest note as lib/auth/rate-limit.ts). On a single server, or while
// developing, this is exact. On Vercel every instance keeps its own counters, so
// treat it as a strong speed bump rather than a wall.
const sendLog = new Map<string, number[]>();

const SEND_WINDOW_MINUTES = 30;
const SEND_MAX_PER_WINDOW = 4;

export function canSendNow(key: string): { allowed: boolean; waitMinutes: number } {
  const now = Date.now();
  const windowMs = SEND_WINDOW_MINUTES * 60000;

  const recent = (sendLog.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= SEND_MAX_PER_WINDOW) {
    const oldest = Math.min(...recent);
    const waitMinutes = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 60000));
    sendLog.set(key, recent);
    return { allowed: false, waitMinutes };
  }

  recent.push(now);
  sendLog.set(key, recent);
  return { allowed: true, waitMinutes: 0 };
}

/** Used after a successful verification so the person is not left blocked. */
export function clearSendLog(key: string): void {
  sendLog.delete(key);
}

// ========================================
// CREATE A TOKEN
// ========================================
export async function issueToken(input: {
  userId: string;
  purpose: string;
  minutes: number;
  /** The administrator who caused it (optional). */
  requestedById?: string | null;
  requestIp?: string | null;
}): Promise<{ raw: string; code: string; expiresAt: Date }> {
  if (!isDatabaseConfigured()) {
    throw new Error('The database is not configured, so a token cannot be created.');
  }

  // Throw away any earlier unused token of the same kind. Otherwise a member
  // could collect several working links, which is exactly what we do not want.
  await prisma.verificationToken.deleteMany({
    where: { userId: input.userId, purpose: input.purpose, usedAt: null },
  });

  const raw = newRawToken();
  const code = newCode();
  const expiresAt = new Date(Date.now() + input.minutes * 60000);

  await prisma.verificationToken.create({
    data: {
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: hashSecret(raw),
      codeHash: hashSecret(code),
      expiresAt,
      requestedById: input.requestedById ?? null,
      requestIp: input.requestIp ?? null,
    },
  });

  return { raw, code, expiresAt };
}

// ========================================
// CHECK A TOKEN (from the link in the email)
// ========================================
export async function findTokenByRaw(
  raw: string,
  purpose: string,
): Promise<{ id: string; userId: string; expired: boolean; used: boolean } | null> {
  if (!isDatabaseConfigured() || !raw) return null;

  const row = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashSecret(raw) },
  });

  if (!row || row.purpose !== purpose) return null;

  return {
    id: row.id,
    userId: row.userId,
    expired: row.expiresAt.getTime() < Date.now(),
    used: Boolean(row.usedAt),
  };
}

// ========================================
// CHECK A CODE (typed by hand on the verify page)
// ========================================
export type CodeCheck =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: 'not-found' | 'expired' | 'used' | 'wrong' | 'too-many' };

export async function checkCode(
  userId: string,
  code: string,
  purpose: string,
): Promise<CodeCheck> {
  if (!isDatabaseConfigured()) return { ok: false, reason: 'not-found' };

  // The newest token for this person and this purpose.
  const row = await prisma.verificationToken.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: 'desc' },
  });

  if (!row) return { ok: false, reason: 'not-found' };
  if (row.usedAt) return { ok: false, reason: 'used' };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

  if (row.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: 'too-many' };

  if (!row.codeHash || row.codeHash !== hashSecret(code)) {
    const attempts = row.attempts + 1;

    // Out of patience: destroy the token so the member must ask for a new one.
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await prisma.verificationToken.update({
        where: { id: row.id },
        data: { attempts, usedAt: new Date() },
      });
      return { ok: false, reason: 'too-many' };
    }

    await prisma.verificationToken.update({ where: { id: row.id }, data: { attempts } });
    return { ok: false, reason: 'wrong' };
  }

  return { ok: true, userId, tokenId: row.id };
}

/**
 * Mark a token as finished with. A token is never usable twice.
 *
 * WHY updateMany AND NOT update
 *   markEmailVerified() deletes every outstanding verification token for that
 *   person - including the very row we are holding here. A plain update() would
 *   then throw "record not found", the member would be marked verified but the
 *   page would show a server error, and they would not know whether it worked.
 *   This was a real bug, caught by the end-to-end test.
 *
 * updateMany() simply changes 0 rows when the row has already gone, which is
 * exactly the behaviour we want.
 */
export async function consumeToken(tokenId: string): Promise<void> {
  try {
    await prisma.verificationToken.updateMany({
      where: { id: tokenId, usedAt: null },
      data: { usedAt: new Date() },
    });
  } catch (error) {
    // Never let housekeeping break the member's success screen.
    console.error('[verification] could not mark the token as used:', error);
  }
}

/** Throw away every outstanding token of one kind for a person. */
export async function clearTokens(userId: string, purpose?: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await prisma.verificationToken.deleteMany({
    where: purpose ? { userId, purpose } : { userId },
  });
}

// ========================================
// SEND THE VERIFICATION EMAIL
// ========================================
// Used in two places, so the wording and the rules can never drift apart:
//   1. an administrator creates a member account
//   2. the member presses "send it again"
export async function sendVerificationEmail(
  user: { id: string; name: string; email: string },
  options: {
    requestedById?: string | null;
    requestIp?: string | null;
    /** Where the link should point. Defaults to NEXT_PUBLIC_SITE_URL. */
    baseUrl?: string;
  } = {},
): Promise<MailResult> {
  const { raw, code } = await issueToken({
    userId: user.id,
    purpose: VERIFY_PURPOSE,
    minutes: VERIFY_MINUTES,
    requestedById: options.requestedById ?? null,
    requestIp: options.requestIp ?? null,
  });

  const email = buildVerificationEmail({
    memberName: user.name,
    code,
    link: verifyEmailLink(raw, options.baseUrl ?? siteUrl()),
    expiresMinutes: VERIFY_MINUTES,
  });

  const result = await sendMail({
    to: user.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  await writeActivity({
    actorId: options.requestedById ?? user.id,
    actorName: options.requestedById ? null : user.name,
    action: 'CREATE',
    entity: 'Verification email',
    entityId: user.id,
    detail: result.ok
      ? `Sent to ${user.email}`
      : `NOT sent to ${user.email}: ${result.error ?? 'unknown reason'}`,
    ipAddress: options.requestIp ?? null,
  });

  return result;
}

// ========================================
// SEND THE PASSWORD RESET EMAIL
// ========================================
export async function sendPasswordResetEmail(
  user: { id: string; name: string; email: string },
  requestIp?: string | null,
  baseUrl?: string,
): Promise<MailResult> {
  const { raw, code } = await issueToken({
    userId: user.id,
    purpose: RESET_PURPOSE,
    minutes: RESET_MINUTES,
    requestIp: requestIp ?? null,
  });

  const email = buildPasswordResetEmail({
    memberName: user.name,
    code,
    link: resetPasswordLink(raw, baseUrl ?? siteUrl()),
    expiresMinutes: RESET_MINUTES,
  });

  const result = await sendMail({
    to: user.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  await writeActivity({
    actorId: user.id,
    actorName: user.name,
    action: 'UPDATE',
    entity: 'Password reset requested',
    entityId: user.id,
    detail: result.ok ? 'Reset email sent' : `Reset email NOT sent: ${result.error ?? ''}`,
    ipAddress: requestIp ?? null,
  });

  return result;
}

// ========================================
// MARK AN ACCOUNT AS VERIFIED
// ========================================
export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  // Nothing is left to verify, so clean up the outstanding tokens.
  await clearTokens(userId, VERIFY_PURPOSE);
}

// ========================================
// THE MESSAGE SHOWN WHEN EMAIL IS NOT SET UP
// ========================================
// Used by the pages so the administrator is told the truth instead of being
// shown a screen that looks like it worked.
export const NO_EMAIL_NOTICE =
  'The email could not be sent because no mail server is configured yet. ' +
  'The link has been printed in the server terminal (the window where you ran ' +
  'npm run dev). Ask your administrator to add the SMTP settings to the .env file.';
