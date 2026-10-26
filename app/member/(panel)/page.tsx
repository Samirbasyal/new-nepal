// ========================================
// /member IS A DOOR, NOT A PAGE
// ========================================
// Same as /admin: the address a person types first should take them somewhere
// useful instead of a 404. The panel layout has already run requireMember().
import { redirect } from 'next/navigation';

export default function MemberIndexPage() {
  redirect('/member/dashboard');
}
