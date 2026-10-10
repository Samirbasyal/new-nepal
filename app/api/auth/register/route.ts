// ========================================
// API - MEMBER REGISTRATION (CLOSED BY DESIGN)
// ========================================
// Address: POST /api/auth/register
//
// WHY THIS ENDPOINT NOW REFUSES EVERYTHING
//   Members must NOT be able to create their own accounts. Only an
//   administrator (or a Super Administrator) creates a member, from:
//       Admin Panel -> Members -> Add member
//   That is what makes the member list trustworthy: every account in the
//   database was entered by a real person in the office, and every account has
//   an email address that can be verified.
//
// HOW IT IS PUT BACK (not recommended)
//   Two separate switches must BOTH be on:
//       1. ALLOW_MEMBER_SELF_REGISTRATION="true"   in the .env file
//       2. Admin Panel -> Settings -> "Allow public member registration" = true
//   The default is off, so a fresh copy of this project is closed.
//
// The old registration code has been removed rather than left switched off,
// because code that is not reachable is code that nobody tests - and it would
// be one forgotten flag away from opening the door again.
// ========================================

import { fail } from '@/lib/api/http';
import { isDatabaseConfigured } from '@/lib/prisma';
import { isRegistrationEnabled } from '@/lib/settings';

const CLOSED_MESSAGE =
  'Member accounts are created by the organization office, not from the website. ' +
  'Please contact the office with your name, email address and phone number, and ' +
  'they will create your account and email you a verification link.';

export async function POST() {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  // Both switches must be on before this endpoint does anything at all.
  const envAllows = (process.env.ALLOW_MEMBER_SELF_REGISTRATION ?? '').toLowerCase() === 'true';
  const settingAllows = await isRegistrationEnabled();

  if (!envAllows || !settingAllows) {
    return fail(CLOSED_MESSAGE, 403);
  }

  // Even with both switches on, self-registration is not supported any more.
  // A member created this way would have no membership number, no address and
  // no district, which the reports now depend on.
  return fail(
    'Self-registration is not available. Please ask the office to create your account.',
    403,
  );
}
