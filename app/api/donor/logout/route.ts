// ========================================
// API - DONOR SIGN OUT
// ========================================
// Address: POST /api/donor/logout   (the donor must be signed in)
//
// It deletes the donor cookie only. A member or administrator who happens to be
// signed in on the same browser stays signed in, because that is a different
// cookie - see lib/donor/session.ts for why they are kept apart.
// ========================================

import { ok } from '@/lib/api/http';
import { destroyDonorSession } from '@/lib/donor/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  await destroyDonorSession();
  return ok({ signedOut: true }, 200, 'You have been signed out.');
}
