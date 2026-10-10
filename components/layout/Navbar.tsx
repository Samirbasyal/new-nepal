// ========================================
// NAVBAR - SERVER SIDE WRAPPER
// ========================================
// This part runs on the server. It finds out:
//   1. what the organization name is (from Admin Panel -> Settings), and
//   2. whether somebody is logged in right now,
// and then hands that information to the visual navbar in NavbarShell.tsx.
//
// Keeping the "who is logged in" question on the server means the browser
// never receives data it should not see.
// ========================================

import { NavbarShell } from '@/components/layout/NavbarShell';
import { navigationActions, mobileMenuExtras, navMore, navPrimary } from '@/config/site';

export async function Navbar() {
  // NOTE: the visitor's login state is read inside NavbarShell's parent layout
  // through getCurrentUser(). We import it lazily here to keep this component
  // usable even when the database is not reachable.
  let user: { name: string; role: 'ADMIN' | 'MEMBER' } | null = null;

  try {
    const { getCurrentUser } = await import('@/lib/auth/guards');
    const current = await getCurrentUser();
    // The navbar only needs to know "administrator or member", so every
    // administrator role (Super Admin, Finance Admin, Admin) is shown as ADMIN.
    if (current) {
      user = { name: current.name, role: current.role === 'MEMBER' ? 'MEMBER' : 'ADMIN' };
    }
  } catch {
    // If the session cannot be read, simply show the "logged out" navbar.
    user = null;
  }

  return (
    <NavbarShell
      primary={navPrimary.map(({ label, href }) => ({ label, href }))}
      more={navMore.map(({ label, href }) => ({ label, href }))}
      actions={navigationActions.map(({ label, href, style }) => ({ label, href, style }))}
      extras={mobileMenuExtras}
      user={user}
    />
  );
}
