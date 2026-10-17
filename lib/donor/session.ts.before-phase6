// ========================================
// DONOR ACCOUNTS - WHO IS SIGNED IN
// ========================================
// A donor signs in with an email address and a password, and gets their own
// signed cookie. From then on they can see the donations they made.
//
// WHY A SEPARATE COOKIE (jsyc_donor)
//   The member and administrator login uses jsyc_session, and everything under
//   /member and /admin trusts it. A donor must never be able to disturb that.
//   Two cookies, two audiences:
//
//     jsyc_session   administrators and members   (unchanged)
//     jsyc_donor     donors only                  (this file)
//
//   A donor cookie therefore cannot open the member panel, the admin panel, or
//   any API that is guarded by a member or administrator role. Signing in as a
//   donor does not sign you in as anything else, and signing out of one does not
//   touch the other.
//
// HOW THE TOKEN IS CHECKED
//   Exactly like the member session: a signed token (HS256, the AUTH_SECRET from
//   .env, a fixed issuer and audience) plus a database re-read on every request.
//   The re-read is what makes "switch this account off" take effect immediately,
//   and what makes a forgotten cookie worthless.
//
// THE SESSION COUNTER (sv)
//   Bumping DonorAccount.sessionVersion ends every session that was already
//   open. Nothing in the website bumps it today except a future password change,
//   but the check is here so that it can never be forgotten.
// ========================================

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { getSecretKey } from '@/lib/auth/token';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

/** The cookie name. Different from every other cookie on the site. */
export const DONOR_COOKIE_NAME = 'jsyc_donor';

// These two values are part of the token's identity. A token signed for the
// member panel is refused here, and vice versa.
const DONOR_ISSUER = 'janakalyan-samataa-yuwa-club';
const DONOR_AUDIENCE = 'donor-account';

const SESSION_DAYS = 14;
const SESSION_DAYS_REMEMBER = 60;

export type DonorIdentity = {
  id: string;
  name: string;
  email: string;
};

/** What the cookie carries. Never the password, never anything private. */
type DonorTokenPayload = {
  sub: string;
  name: string;
  email: string;
  sv: number;
};

// ========================================
// CREATE
// ========================================
export async function createDonorSession(donor: DonorIdentity & { sessionVersion?: number }, remember = false) {
  const days = remember ? SESSION_DAYS_REMEMBER : SESSION_DAYS;
  const maxAgeSeconds = days * 24 * 60 * 60;
  const expiresAt = Math.floor((Date.now() + maxAgeSeconds * 1000) / 1000);

  const token = await new SignJWT({
    name: donor.name,
    email: donor.email,
    sv: donor.sessionVersion ?? 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(donor.id)
    .setIssuedAt()
    .setIssuer(DONOR_ISSUER)
    .setAudience(DONOR_AUDIENCE)
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(DONOR_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

// ========================================
// DESTROY
// ========================================
export async function destroyDonorSession() {
  const cookieStore = await cookies();
  cookieStore.set(DONOR_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// ========================================
// READ THE SIGNED TOKEN ONLY
// ========================================
async function readDonorToken(): Promise<DonorTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(DONOR_COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: DONOR_ISSUER,
      audience: DONOR_AUDIENCE,
    });

    if (!payload.sub) return null;

    return {
      sub: String(payload.sub),
      name: String(payload.name ?? ''),
      email: String(payload.email ?? ''),
      sv: typeof payload.sv === 'number' ? payload.sv : 1,
    };
  } catch {
    // Missing secret, expired token, edited token, another site's token.
    return null;
  }
}

// ========================================
// WHO IS SIGNED IN RIGHT NOW
// ========================================
// cache() means the admin of a single page load costs one query, not several.
export const getCurrentDonor = cache(async (): Promise<DonorIdentity | null> => {
  const token = await readDonorToken();
  if (!token) return null;

  // Without a database the account cannot be re-checked, so access is refused.
  if (!isDatabaseConfigured()) return null;

  try {
    const donor = await prisma.donorAccount.findUnique({
      where: { id: token.sub },
      select: { id: true, name: true, email: true, isActive: true, sessionVersion: true },
    });

    if (!donor || !donor.isActive) return null;

    // The cookie was signed before a password change (or any other reason to
    // end the session). Refuse it.
    if (donor.sessionVersion !== token.sv) return null;

    return { id: donor.id, name: donor.name, email: donor.email };
  } catch {
    return null;
  }
});

// ========================================
// PAGE GUARD
// ========================================
// Use at the top of every page that shows a donor their own donations.
export async function requireDonor(): Promise<DonorIdentity> {
  const donor = await getCurrentDonor();
  if (!donor) redirect('/donor/login?notice=login-required');
  return donor;
}
