// ========================================
// OLD ADDRESS - NOW A FORWARD
// ========================================
// Address: /member/login  ->  /member/portal?tab=login
//
// The sign-in form no longer lives here. It lives in the Member Portal, next to
// the registration request, so a visitor sees one door instead of two competing
// ones. See components/member/MemberPortal.tsx for why.
//
// WHY THE ADDRESS IS KEPT
//   This address is in the footer, in old emails and in people's bookmarks. A
//   "page not found" would look like the site had broken, so every old link is
//   forwarded to the same form with the right tab already open - including the
//   ?notice= and ?next= values that explain why somebody was sent here.
// ========================================

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MemberLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const params = await searchParams;

  const query = new URLSearchParams({ tab: 'login' });
  if (params.notice) query.set('notice', params.notice);
  if (params.next) query.set('next', params.next);

  redirect(`/member/portal?${query.toString()}`);
}
