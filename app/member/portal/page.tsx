// ========================================
// MEMBER PORTAL (PUBLIC)
// ========================================
// Address: /member/portal        (the "Register" tab is ?tab=register)
//
// This is the ONE public door into membership. It replaces the old separate
// sign-in page and the old "registration is closed" page, which have both been
// turned into forwards to this address so old links keep working.
//
// WHY IT IS PUBLIC
//   Nobody can sign in before they have an account, and nobody can ask to join
//   before they have a membership. Everything that needs a session lives behind
//   /member/(panel), which the guards protect on the server.
//
// THE LOOK
//   The page itself is now nothing but the shared auth frame (components/auth/
//   AuthFrame.tsx) and the two tabs. All the extra headings, the three
//   reassurance cards and the side copy are gone, so the register form sits in
//   exactly the same clean card as the login form - which is what was asked for.
// ========================================

import type { Metadata } from 'next';
import { MemberPortal } from '@/components/member/MemberPortal';
import { AuthFrame } from '@/components/auth/AuthFrame';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member portal',
  description:
    'Request membership of Janakalyan Samataa Yuwa Club, or sign in to the member panel.',
  robots: { index: true, follow: true },
};

export default async function MemberPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; notice?: string; next?: string }>;
}) {
  const params = await searchParams;

  // The tab is decided on the server so the very first paint is already correct:
  // no flicker from "login" to "register" while JavaScript loads.
  const requested = (params.tab ?? '').toLowerCase();
  const initialTab = requested === 'register' || requested === 'join' ? 'register' : 'login';

  return (
    <AuthFrame note="Member area" width="lg">
      <MemberPortal initialTab={initialTab} notice={params.notice} next={params.next} />
    </AuthFrame>
  );
}
