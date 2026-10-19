// ========================================
// DONOR - SIGN OUT BUTTON
// ========================================
// A single button, because signing out has to be a real server action: the
// cookie is httpOnly, so the browser cannot clear it by itself. The route deletes
// it and the page moves back to the donation page.
//
// It only removes the DONOR cookie. A member or administrator signed in on the
// same browser stays signed in - those are different cookies on purpose.
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

export function DonorLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);

    try {
      await fetch('/api/donor/logout', { method: 'POST' });
    } catch {
      // Even if the request fails the button should not hang. The cookie expires
      // on its own; the worst case is that the person is asked again next time.
    } finally {
      router.push('/donate');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="btn btn-outline btn-sm"
    >
      <Icon name={busy ? 'refresh' : 'logout'} className={busy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      {busy ? (<span className="text-accent-100" role="status">Please wait...</span>) : 'Sign out'}
    </button>
  );
}
