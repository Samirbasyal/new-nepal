// ========================================
// AUTHENTICATION - LOGIN SESSIONS (COOKIE HANDLING)
// ========================================
// After somebody logs in we give the browser a signed "session cookie".
// On every later request the browser sends that cookie back and we check the
// signature to find out who the person is and what role they have.
//
// WHY A SIGNED COOKIE?
//   The cookie content is signed with the AUTH_SECRET value from your .env
//   file. If somebody edits the cookie to change their role from MEMBER to
//   ADMIN, the signature no longer matches and we reject it.
//
// IMPORTANT FOR BEGINNERS
//   The cookie only TELLS US who you are. It never by itself decides what you
//   may do. Every admin page and every admin API route re-checks the role on
//   the server (see lib/auth/guards.ts and lib/api/guard.ts).
//
// The token signing/checking itself lives in lib/auth/token.ts.
// ========================================

import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { readSessionToken, signSessionToken, type Session, type SessionUser } from '@/lib/auth/token';

// Re-export the shared types so other files can import them from here.
export type { Session, SessionUser, SessionRole } from '@/lib/auth/token';

// 8 hours for a normal login, 30 days when "keep me signed in" is ticked.
const SESSION_HOURS = 8;
const SESSION_HOURS_REMEMBER = 24 * 30;

// ========================================
// CREATE A SESSION (called right after a successful login)
// ========================================
export async function createSession(user: SessionUser, remember: boolean = false): Promise<void> {
  const maxAgeSeconds = (remember ? SESSION_HOURS_REMEMBER : SESSION_HOURS) * 60 * 60;
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  const token = await signSessionToken(user, Math.floor(expiresAt.getTime() / 1000));

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, // browser JavaScript cannot read it (protection against XSS)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // protection against cross-site request forgery
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

// ========================================
// READ THE CURRENT SESSION (server side only)
// ========================================
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

// ========================================
// DESTROY THE SESSION (logout)
// ========================================
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // delete the cookie immediately
  });
}
