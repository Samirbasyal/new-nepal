// ========================================
// LOGOUT BUTTON
// ========================================
// Signs the user out and returns them to the home page.
//
// WHAT HAPPENS
//   1. The browser calls the API at /api/auth/logout
//   2. The server deletes the signed session cookie
//   3. The page refreshes so the navbar shows "Member Login" again
//
// A logged-out visitor cannot get back in with the browser "Back" button,
// because the session cookie no longer exists.
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export function LogoutButton({
  className,
  label = 'Sign out',
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if the request fails we still refresh, so the user is not stuck.
    }
    // Send the visitor home and refresh so the server re-renders the navbar.
    router.replace('/');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <Icon name="logout" className="h-4 w-4" />
      {busy ? 'Signing out…' : label}
    </button>
  );
}
