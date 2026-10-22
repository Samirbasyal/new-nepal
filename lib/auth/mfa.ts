// ========================================
// TWO-STEP VERIFICATION - THE SHORT-LIVED CHALLENGE
// ========================================
// When an administrator signs in with a correct password but has two-step
// verification turned on, we do NOT create a session. We hand back a small,
// signed "challenge" instead:
//
//   browser: password  ──►  challenge cookie (10 minutes)  ──►  code  ──►  session
//
// WHAT IS IN THE CHALLENGE
//   sub     the user id       (so we know who is halfway through signing in)
//   portal  member or admin   (so the right dashboard opens afterwards)
//   remember whether "keep me signed in" was ticked
//
// It carries NO role and NO permissions - it cannot be used in place of a
// session cookie, because it has a different audience and nothing reads it
// except /api/auth/mfa.
//
// WHY A SIGNED COOKIE RATHER THAN A DATABASE ROW
//   It expires by itself in ten minutes, it cannot be edited (the signature
//   covers it), and it leaves nothing to clean up. The password has already been
//   proven at this point, so there is no secret in it worth stealing.
// ========================================

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getSecretKey, TOKEN_ISSUER } from '@/lib/auth/token';

export const MFA_CHALLENGE_COOKIE = 'jsyc_mfa';

const MFA_AUDIENCE = 'mfa-challenge';
const MFA_MINUTES = 10;

export type MfaChallenge = {
  userId: string;
  portal: 'member' | 'admin';
  remember: boolean;
};

export async function signMfaChallenge(challenge: MfaChallenge): Promise<string> {
  return new SignJWT({
    sub: challenge.userId,
    portal: challenge.portal,
    remember: challenge.remember,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(TOKEN_ISSUER)
    .setAudience(MFA_AUDIENCE)
    .setExpirationTime(Math.floor(Date.now() / 1000) + MFA_MINUTES * 60)
    .sign(getSecretKey());
}

export async function readMfaChallenge(token: string | undefined): Promise<MfaChallenge | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: TOKEN_ISSUER,
      audience: MFA_AUDIENCE,
    });

    if (!payload.sub) return null;

    return {
      userId: String(payload.sub),
      portal: payload.portal === 'admin' ? 'admin' : 'member',
      remember: payload.remember === true,
    };
  } catch {
    return null;
  }
}

export async function setMfaChallengeCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(MFA_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MFA_MINUTES * 60,
  });
}

export async function clearMfaChallengeCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(MFA_CHALLENGE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
