// ========================================
// API - HOW MANY MEMBERSHIP REQUESTS ARE WAITING
// ========================================
// Address: GET /api/admin/membership-requests/pending-count
//
// WHAT USES IT
//   The Admin Panel menu badge. It is polled every half minute by
//   components/admin/AdminNav.tsx, so the number rises by itself when somebody
//   sends a request - without the administrator reloading anything.
//
// SECURITY
//   Administrators only (requireAdminApi). A member calling this receives 403,
//   and a signed-out visitor 401, exactly like every other admin endpoint.
//
// It returns counts only - never a name, an email or anything personal.
// ========================================

import { ok } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { countPendingRequests, countUnreadRequests } from '@/lib/membership/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const [pending, unread] = await Promise.all([countPendingRequests(), countUnreadRequests()]);

  return ok({ pending, unread });
}
