// ========================================
// API - AUTHORIZATION GUARD (BACKEND PROTECTION)
// ========================================
// THIS IS THE MOST IMPORTANT SECURITY FILE IN THE PROJECT.
//
// Hiding the "Admin" link in the navbar does NOT protect anything: anybody
// can type /admin/dashboard into the address bar. Protection must happen on
// the SERVER, and that is what this file does.
//
// Every route inside app/api/admin/... starts with:
//
//     const auth = await requireAdminApi(request);
//     if (!auth.ok) return auth.response;   // 401 or 403 - stop here
//     // ... only real administrators reach this line
//
// A logged-in MEMBER calling an admin API receives 403 Forbidden.
// A visitor who is not logged in receives 401 Unauthorized.
// ========================================

import type { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/guards';
import type { SessionUser } from '@/lib/auth/session';
import { forbidden, fail, unauthorized } from '@/lib/api/http';
import { isAdminRole, isSuperAdminRole } from '@/lib/constants';

export type ApiAuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

// ========================================
// CROSS-SITE REQUEST PROTECTION (CSRF)
// ========================================
// A malicious website could try to make a logged-in administrator's browser
// send a hidden request to our API. Browsers always attach an "Origin"
// header, so we compare it with our own address and refuse anything else.
// ========================================
function isSameOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  // Reading data (GET) is safe and does not need this check.
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // No Origin header (for example a script on the same server) -> allow.
  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// ========================================
// ADMIN API GUARD
// ========================================
export async function requireAdminApi(request: Request): Promise<ApiAuthResult> {
  if (!isSameOrigin(request)) {
    return { ok: false, response: fail('This request was blocked for security reasons.', 403) };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, response: unauthorized('You must sign in as an administrator.') };
  }

  if (!isAdminRole(user.role)) {
    // A normal member (or any non-admin) is stopped right here.
    return {
      ok: false,
      response: forbidden('You are not authorized to access this page. Administrators only.'),
    };
  }

  return { ok: true, user };
}

// ========================================
// ========================================
// SUPER ADMIN API GUARD
// ========================================
// Used by the few financial actions that only a Super Administrator may do,
// for example APPROVING an expense. A Finance Admin who calls the same API
// receives 403 and the money record is left untouched.
// ========================================
export async function requireSuperAdminApi(request: Request): Promise<ApiAuthResult> {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth;

  if (!isSuperAdminRole(auth.user.role)) {
    return {
      ok: false,
      response: forbidden(
        'Only a Super Administrator may approve or reverse this record.',
      ),
    };
  }

  return auth;
}

// ========================================
// MEMBER API GUARD
// ========================================
export async function requireMemberApi(request: Request): Promise<ApiAuthResult> {
  if (!isSameOrigin(request)) {
    return { ok: false, response: fail('This request was blocked for security reasons.', 403) };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, response: unauthorized('You must sign in to do this.') };
  }

  // ---------- Is the email address verified? ----------
  // A member cannot use the member APIs until they have proved the address is
  // theirs. Administrators are exempt (they never went through the invite step).
  if (!isAdminRole(user.role) && user.emailVerified === false) {
    return {
      ok: false,
      response: forbidden(
        'Please verify your email address first. Open the "Verify email" page in your panel.',
      ),
    };
  }

  // Administrators may also use member endpoints (they are members too).
  return { ok: true, user };
}
