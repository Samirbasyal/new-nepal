// ========================================
// MIDDLEWARE - THE FIRST LINE OF PROTECTION
// ========================================
// This file runs BEFORE any protected page is rendered.
//
// It is the fast, friendly layer:
//   - no valid session cookie       -> send the visitor to the login page
//   - logged-in member on an admin
//     page                          -> send them to the "not authorized" page
//
// ========================================
// THIS FILE IS NOT ENOUGH ON ITS OWN
// ========================================
// Middleware is only the FIRST check. Every admin page and every admin API
// route repeats the check on the server:
//     - pages: lib/auth/guards.ts      -> requireAdmin() / requireMember()
//     - APIs:  lib/api/guard.ts        -> requireAdminApi()
//
// That "belt and braces" approach matters because a middleware mistake must
// never be enough to expose the Admin Panel. See PROJECT_GUIDE.md,
// section "How the Admin Panel is protected".
// ========================================

import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, isAdminRole } from '@/lib/constants';
import { readSessionToken } from '@/lib/auth/token';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ---------- Read the session cookie ----------
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await readSessionToken(token) : null;

  // ========================================
  // 1. ADMIN AREA
  // ========================================
  if (pathname.startsWith('/admin')) {
    // The login page itself must stay reachable, otherwise nobody could sign in.
    const isLoginPage = pathname === '/admin/login';

    // isAdminRole() accepts SUPER_ADMIN, FINANCE_ADMIN and ADMIN.
    if (isLoginPage && isAdminRole(session?.user.role)) {
      // Already signed in as an administrator -> go straight to the dashboard.
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    if (!isLoginPage) {
      // Not signed in at all.
      if (!session) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('notice', 'login-required');
        loginUrl.searchParams.set('next', `${pathname}${search}`);
        return NextResponse.redirect(loginUrl);
      }

      // Signed in, but not an administrator (a normal member).
      if (!isAdminRole(session.user.role)) {
        return NextResponse.redirect(new URL('/unauthorized?reason=admin-only', request.url));
      }
    }
  }

  // ========================================
  // 2. MEMBER AREA
  // ========================================
  if (pathname.startsWith('/member')) {
    // ---------- Pages that must stay open to the PUBLIC ----------
    // A member whose email address is not verified yet, and a member who has
    // forgotten their password, CANNOT sign in. The pages that solve those two
    // problems therefore have to work while signed out - otherwise those people
    // would be sent to a sign-in page they are unable to use, and the account
    // would need an administrator to fix it by hand.
    //
    // This was a real bug once: verify-email, forgot-password and
    // reset-password were treated as panel pages and redirected everything to
    // the sign-in page.
    const OPEN_PAGES = [
      '/member/login',
      '/member/register',
      '/member/verify-email',
      '/member/forgot-password',
      '/member/reset-password',
    ];

    const isOpenPage = OPEN_PAGES.includes(pathname);

    if (!isOpenPage && !session) {
      const loginUrl = new URL('/member/login', request.url);
      loginUrl.searchParams.set('notice', 'login-required');
      loginUrl.searchParams.set('next', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    // Administrators are allowed into the member area too - they are members as
    // well, and the member dashboard is a useful overview for them.

    // ---------- Already signed in? ----------
    // Only the sign-in page and the "how do I get an account" page send a
    // signed-in member onwards. The verify, forgot and reset pages are left
    // alone on purpose: a link from an email must always open, even on a
    // browser where somebody happens to be signed in.
    if (session && (pathname === '/member/login' || pathname === '/member/register')) {
      return NextResponse.redirect(new URL('/member/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// ========================================
// WHICH ADDRESSES THIS MIDDLEWARE RUNS ON
// ========================================
// It runs on the panel pages and the panel APIs only. Public pages and public
// forms are not affected at all, so they stay as fast as possible.
export const config = {
  matcher: ['/admin/:path*', '/member/:path*', '/api/admin/:path*', '/api/member/:path*'],
};
