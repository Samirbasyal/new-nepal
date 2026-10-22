// ========================================
// OLD ADDRESS - NOW A FORWARD
// ========================================
// Address: /member/register  ->  /member/portal?tab=register
//
// Registration used to be CLOSED here: an applicant was told to ring the office
// because only an administrator could create an account.
//
// It is open again, but not as self-registration: the portal form writes a
// membership REQUEST that an administrator must approve, and the account is only
// created when the applicant activates it. So the address now forwards to the
// real form instead of an explanation.
// ========================================

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MemberRegisterRedirect() {
  redirect('/member/portal?tab=register');
}
