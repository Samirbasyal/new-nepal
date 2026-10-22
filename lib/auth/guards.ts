// ========================================
// AUTHENTICATION + AUTHORIZATION (PAGE GUARDS)
// ========================================
// These functions protect whole pages. A page calls one of them at the top
// and, if the visitor is not allowed to be there, they are redirected.
//
// THREE LEVELS OF ACCESS
//   PUBLIC -> everybody (home page, about, news, gallery...)
//   MEMBER -> logged in member (member panel)
//   ADMIN  -> logged in administrator (admin panel)
//
// WHY WE ALSO LOOK IN THE DATABASE
//   The session cookie already contains the role, but plenty of things can
//   change after the cookie was issued. Re-reading the user row makes sure that:
//     - a member who was promoted to admin gets access immediately,
//     - a disabled or suspended account loses access immediately,
//     - and a password change ends every session that was already open.
//
// NEVER rely on hiding a menu link. Hiding the link is only cosmetic;
// these checks happen on the server and are what actually protect the pages.
// ========================================

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession, type SessionUser } from '@/lib/auth/session';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { isAdminRole, isSuperAdminRole, canRecordExpenseRole } from '@/lib/constants';
import { adminLoginUrl } from '@/lib/auth/admin-entry';

// ========================================
// WHY cache() IS USED BELOW (PERFORMANCE)
// ========================================
// React's cache() remembers the RESULT of a function for the duration of ONE
// request. The admin and member layouts ask "who is signed in?" and so does
// every page inside them, which meant the SAME database lookup ran 2-3 times on
// a single page load. With cache() it runs once and the answer is reused.
//
// Nothing about the security changes: the checks below still run, the cookie is
// still verified, and the account is still re-read from the database - just not
// repeatedly within the same request.
// ========================================
/**
 * Who is logged in right now? Returns null for visitors, or the fresh
 * database record for a logged-in, active user.
 *
 * FOUR THINGS ARE CHECKED HERE, ALL ON THE SERVER:
 *   1. the cookie signature (inside getSession)
 *   2. the account still exists and is switched on
 *   3. the session counter still matches  (a password change ends old sessions)
 *   4. the membership is not suspended
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session) return null;

  // Without a database we cannot double-check the account, so we deny access.
  if (!isDatabaseConfigured()) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        sessionVersion: true,
        profile: { select: { status: true } },
      },
    });

    if (!user || !user.isActive) return null;

    // ---------- 3. Was this session cancelled? ----------
    // Changing a password increases sessionVersion in the database (see
    // app/api/auth/reset-password/route.ts). A cookie carrying an older number
    // is refused right here, so "the old password no longer works" is also true
    // for a browser that was already signed in.
    const cookieVersion = session.user.sessionVersion ?? 1;
    if (cookieVersion !== user.sessionVersion) return null;

    // ---------- 4. Suspended membership ----------
    // A suspended member keeps their login records but loses access.
    if (user.profile?.status === 'SUSPENDED') return null;

    // The real role is passed through untouched, so that Super Administrators
    // and Finance Administrators keep their extra powers. Any value that is not
    // a known role is treated as a plain MEMBER (safest possible fallback).
    const knownRoles = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'ADMIN', 'MEMBER'];

    const role: SessionUser['role'] = knownRoles.includes(user.role)
      ? (user.role as SessionUser['role'])
      : 'MEMBER';

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      sessionVersion: user.sessionVersion,
      // Administrators are never stopped by the email verification step - they
      // were created from the terminal, not invited by email. Members are.
      emailVerified: isAdminRole(role) || Boolean(user.emailVerifiedAt),
    };
  } catch {
    return null;
  }
});

// ========================================
// ADMIN GUARD
// Use this at the top of every page inside app/admin/ (except the login page).
// ========================================
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    // Not logged in -> send them to the PRIVATE admin sign-in page.
    //
    // The address is not linked anywhere on the public website (see
    // lib/auth/admin-entry.ts). Hiding it is only a courtesy, though: the check
    // that matters is the role check a few lines below, and the same check is
    // repeated in lib/api/guard.ts for every admin API.
    redirect(adminLoginUrl({ notice: 'login-required' }));
  }

  if (!isAdminRole(user.role)) {
    // Logged in, but only a member -> show the "not authorized" page.
    // A normal member can never see the admin dashboard.
    redirect('/unauthorized?reason=admin-only');
  }

  return user;
}

// ========================================
// SUPER ADMIN GUARD
// Used by the few actions that only a Super Administrator may perform:
// approving an expense, and everything inside Loan management.
// ========================================
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAdmin();

  if (!isSuperAdminRole(user.role)) {
    redirect('/unauthorized?reason=super-admin-only');
  }

  return user;
}

// ========================================
// FINANCE GUARD
// Admin Panel access PLUS permission to touch money records
// (verify member payments, record expenses).
// ========================================
export async function requireFinanceAccess(): Promise<SessionUser> {
  const user = await requireAdmin();

  if (!canRecordExpenseRole(user.role)) {
    redirect('/unauthorized?reason=finance-only');
  }

  return user;
}

// ========================================
// MEMBER GUARD
// Use this at the top of every page inside app/member/ (except the login page
// and the verification pages).
// ========================================
export async function requireMember(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/member/portal?tab=login&notice=login-required');
  }

  // The member panel stays closed until the email address has been proven.
  // Administrators are exempt (see getCurrentUser above).
  if (!isAdminRole(user.role) && user.emailVerified === false) {
    redirect('/member/verify-email?notice=verify-required');
  }

  return user;
}

// ========================================
// SMALL HELPERS FOR THE USER INTERFACE
// These decide what the navbar shows. They NEVER replace the guards above.
// ========================================

/** Show the "Admin Panel" link only to real administrators. */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return isAdminRole(user?.role);
}

/** Show "Member Login" or "My Dashboard" in the navbar. */
export async function isMember(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user);
}
