// ========================================
// API - "AN ADMINISTRATOR HAS SEEN THIS"
// ========================================
// Address: POST /api/admin/membership-requests/<id>/read
//          POST /api/admin/membership-requests/all/read  (see ../all/read)
//
// The menu badge counts PENDING requests; this stamp is what lets the office tell
// a request that has been read from one that arrived while nobody was looking.
//
// It only fills an empty column (service.markRequestRead does the updateMany with
// adminReadAt: null), so opening the same application twice keeps the FIRST
// reading time - which is the useful fact.
// ========================================

import { ok } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { markRequestRead } from '@/lib/membership/service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  await markRequestRead(id);

  return ok({ id, read: true });
}
