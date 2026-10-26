// ========================================
// MEMBERSHIP REQUESTS - ACTIVATION LINKS
// ========================================
// An approval does NOT create an account. It creates a SECRET LINK that lets the
// applicant create their own account. This file is the only place that secret is
// made, checked and thrown away.
//
// THE RULES (same ones the email verification tokens follow)
//   1. The link contains a long random value. That value is never stored.
//   2. Only its SHA-256 fingerprint is saved on the request row, so somebody who
//      reads the whole database still cannot build a working link.
//   3. It EXPIRES (7 days) and can be used ONCE. Opening it twice does nothing
//      the second time, so a forwarded email is harmless after the first use.
//   4. Approving again, or pressing "new link", replaces the old one - an
//      administrator can therefore cancel a link that was sent to the wrong
//      address simply by issuing a new one.
//
// WHY NOT REUSE VerificationToken
//   That table points at a User row, and the whole design here is that the user
//   row does not exist until the applicant has chosen a password.
// ========================================

import { randomBytes } from 'node:crypto';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { hashSecret, siteUrl } from '@/lib/auth/verification';

// Seven days: long enough for somebody who reads email once a week, short enough
// that an old forwarded link is not a permanent key.
export const ACTIVATION_MINUTES = 60 * 24 * 7;

/**
 * The address that goes into the approval email.
 *
 * `base` is the origin of the request that triggered the email. Without it the
 * link is built from NEXT_PUBLIC_SITE_URL, which in development is
 * http://localhost:3000 - and a member who opens that on a phone gets
 * ERR_CONNECTION_REFUSED, because "localhost" there means the phone itself.
 */
export function activationLink(rawToken: string, base: string = siteUrl()): string {
  return `${base}/member/activate?token=${encodeURIComponent(rawToken)}`;
}

export type IssuedActivation = {
  raw: string;
  expiresAt: Date;
  link: string;
};

/**
 * Create (or replace) the activation link for one request.
 *
 * Called on approval, and again if an administrator asks for a fresh link
 * because the first one expired or went to the wrong address.
 */
export async function issueActivation(requestId: string, base?: string): Promise<IssuedActivation> {
  if (!isDatabaseConfigured()) {
    throw new Error('The database is not configured, so an activation link cannot be created.');
  }

  // 32 random bytes = 256 bits. Guessing this is not realistic.
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ACTIVATION_MINUTES * 60000);

  await prisma.membershipRequest.update({
    where: { id: requestId },
    data: {
      activationTokenHash: hashSecret(raw),
      activationExpiresAt: expiresAt,
      activationEmailSent: false,
      activationSentAt: null,
    },
  });

  return { raw, expiresAt, link: activationLink(raw, base ?? siteUrl()) };
}

export type ActivationLookup =
  | { ok: true; requestId: string; email: string; fullName: string }
  | {
      ok: false;
      reason: 'not-found' | 'expired' | 'used' | 'not-approved' | 'rejected' | 'already-activated';
    };

/**
 * Turn a token from the link into the request it belongs to.
 *
 * Every failure is described plainly so the activation page can say something
 * useful ("this link has expired - ask the office for a new one") instead of a
 * generic error.
 */
export async function findActivation(rawToken: string): Promise<ActivationLookup> {
  if (!isDatabaseConfigured() || !rawToken) return { ok: false, reason: 'not-found' };

  const row = await prisma.membershipRequest.findUnique({
    where: { activationTokenHash: hashSecret(rawToken) },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
      activatedAt: true,
      activationExpiresAt: true,
      userId: true,
    },
  });

  if (!row) return { ok: false, reason: 'not-found' };
  // Checked BEFORE the status, because an activated request keeps its status
  // APPROVED - and "already used" is the useful answer for that person.
  if (row.activatedAt || row.userId) return { ok: false, reason: 'already-activated' };
  if (row.status === 'REJECTED') return { ok: false, reason: 'rejected' };
  if (row.status !== 'APPROVED') return { ok: false, reason: 'not-approved' };
  if (!row.activationExpiresAt || row.activationExpiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, requestId: row.id, email: row.email, fullName: row.fullName };
}
