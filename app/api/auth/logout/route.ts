// ========================================
// API - LOGOUT
// ========================================
// Address: POST /api/auth/logout
//
// Deletes the signed session cookie. After this the visitor is "PUBLIC"
// again and every protected page sends them back to a login page.
// ========================================

import { destroySession, getSession } from '@/lib/auth/session';
import { writeActivity } from '@/lib/audit';
import { ok } from '@/lib/api/http';

export async function POST() {
  // Read the session first, so we can record who signed out.
  const session = await getSession();

  // Remove the cookie.
  await destroySession();

  if (session) {
    await writeActivity({
      actorId: session.user.id,
      actorName: session.user.name,
      action: 'LOGOUT',
      entity: session.user.role === 'ADMIN' ? 'Admin Panel' : 'Member Panel',
      detail: session.user.email,
    });
  }

  return ok({ signedOut: true }, 200, 'You have been signed out.');
}
