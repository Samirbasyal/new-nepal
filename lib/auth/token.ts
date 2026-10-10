// ========================================
// AUTHENTICATION - SESSION TOKEN (SIGNING AND CHECKING)
// ========================================
// This file contains ONLY the part that creates and checks a session token.
//
// WHY IT IS SEPARATE FROM session.ts
//   The middleware (middleware.ts) runs in a very restricted environment
//   where the "next/headers" helpers are not available. Keeping the pure
//   token logic here lets the middleware use exactly the same signed token
//   rules as the rest of the website - one implementation, no drift.
//
// WHAT IS INSIDE THE TOKEN
//   sub  -> the user id
//   role -> the role at the moment of signing in
//   sv   -> the session counter (see User.sessionVersion in the schema)
//   ev   -> whether the email address was already verified at sign-in time
//
//   sv is what lets us cancel a session. When a password is changed the
//   counter in the database goes up, so every cookie with an older number is
//   refused (see lib/auth/guards.ts). A signed cookie therefore never becomes a
//   permanent key.
// ========================================

import { SignJWT, jwtVerify } from 'jose';

// The four roles the website knows about.
//   SUPER_ADMIN   -> everything, including approving expenses and loans
//   FINANCE_ADMIN -> Admin Panel plus recording expenses / verifying payments
//   ADMIN         -> full Admin Panel (content, members, fund verification)
//   MEMBER        -> Member Panel only
export type SessionRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'ADMIN' | 'MEMBER';

const KNOWN_ROLES: SessionRole[] = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'ADMIN', 'MEMBER'];

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
  /**
   * The session counter at the moment of signing in.
   * Optional so that older callers keep compiling; when it is missing we treat
   * it as 1, which is the starting value in the database.
   */
  sessionVersion?: number;
  /**
   * true when the member's email address has been proven (or when the account
   * is an administrator, who does not need the email step).
   * Optional for the same reason as above.
   */
  emailVerified?: boolean;
};

export type Session = {
  user: SessionUser;
  expiresAt: string;
};

// The values we put inside the token. They are also checked when reading it,
// so a token signed for another website can never be used here.
export const TOKEN_ISSUER = 'janakalyan-samataa-yuwa-club';
export const TOKEN_AUDIENCE = 'website';

/** Read the signing key from the .env file (never hard-coded). */
export function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Open your .env file and set AUTH_SECRET ' +
        'to a long random string (at least 32 characters). Create one with: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  return new TextEncoder().encode(secret);
}

/** Create a signed token for a user. */
export async function signSessionToken(
  user: SessionUser,
  expiresAtSeconds: number,
): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    // sv = session version, ev = email already verified
    sv: user.sessionVersion ?? 1,
    ev: user.emailVerified ?? false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setExpirationTime(expiresAtSeconds)
    .sign(getSecretKey());
}

/**
 * Check a token's signature and read the user from it.
 * Returns null when the token is missing, expired, edited or signed with a
 * different key. It never throws, so callers can simply use "if (!session)".
 *
 * IMPORTANT: this only proves who the person is. Whether they may open a page
 * is decided separately (see lib/auth/guards.ts and lib/api/guard.ts).
 */
export async function readSessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });

    if (!payload.sub) return null;

    // If the token contains a role we do not recognise (for example because it
    // was issued before a role was renamed) we fall back to MEMBER, which is
    // the least powerful role.
    const tokenRole = String(payload.role ?? '');
    const role: SessionRole = KNOWN_ROLES.includes(tokenRole as SessionRole)
      ? (tokenRole as SessionRole)
      : 'MEMBER';

    return {
      user: {
        id: String(payload.sub),
        email: String(payload.email ?? ''),
        name: String(payload.name ?? ''),
        role,
        sessionVersion: typeof payload.sv === 'number' ? payload.sv : 1,
        emailVerified: payload.ev === true,
      },
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : '',
    };
  } catch {
    return null;
  }
}
