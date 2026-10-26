// ========================================
// /admin IS A DOOR, NOT A PAGE
// ========================================
// Typing the site address and then "/admin" is the first thing anybody does, and
// until now that gave a 404 - the panel's own front door was missing. The panel
// layout has already run requireAdmin() by the time this runs, so an anonymous
// visitor never reaches the redirect.
import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  redirect('/admin/dashboard');
}
