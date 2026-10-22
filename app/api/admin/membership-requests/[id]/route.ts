// ========================================
// API - EDIT OR DELETE ONE MEMBERSHIP REQUEST
// ========================================
// Address: PATCH  /api/admin/membership-requests/<id>   correct the details
//          DELETE /api/admin/membership-requests/<id>   remove it for good
//
// WHO MAY CALL IT
//   Any signed-in administrator, checked on the server by requireAdminApi().
//
// TWO THINGS THIS REFUSES ON PURPOSE
//   - DELETE is refused for a request that produced an account. That row is the
//     only record of how a real member joined, and deleting it would also break
//     the link between the member and their application.
//   - PATCH cannot move the email onto an address another account or request
//     already uses (enforced in lib/membership/service.ts, not here).
// ========================================

import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { membershipRequestUpdateSchema } from '@/lib/membership/schemas';
import { deleteRequest, updateRequest } from '@/lib/membership/service';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = membershipRequestUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const result = await updateRequest({
    id,
    adminId: auth.user.id,
    adminName: auth.user.name,
    data: parsed.data,
  });

  if (!result.ok) return fail(result.message, 409, result.fields);

  return ok({ id }, 200, 'The application has been updated.');
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const result = await deleteRequest({ id, adminId: auth.user.id, adminName: auth.user.name });
  if (!result.ok) return fail(result.message, 409);

  return ok({ id }, 200, 'The request has been permanently deleted.');
}
