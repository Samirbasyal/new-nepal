// ========================================
// API - "MARK EVERY REQUEST AS SEEN"
// ========================================
// Address: POST /api/admin/membership-requests/read-all
//
// The button of the same name on the requests screen. It stamps adminReadAt on
// every request that has never been opened, so the "new" markers clear in one go.
//
// It does NOT approve, reject or delete anything - the status of every request is
// left exactly as it was.
// ========================================

import { ok } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { markAllRequestsRead } from '@/lib/membership/service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const count = await markAllRequestsRead();

  return ok({ marked: count }, 200, count > 0 ? `${count} request(s) marked as read.` : 'Nothing to mark.');
}
