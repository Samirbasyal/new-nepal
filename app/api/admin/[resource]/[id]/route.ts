// ========================================
// API - ADMIN PANEL: READ ONE, UPDATE, DELETE
// ========================================
// Addresses:
//   GET    /api/admin/programs/abc123   -> read one program
//   PATCH  /api/admin/programs/abc123   -> change it
//   DELETE /api/admin/programs/abc123   -> remove it
//
// PATCH and DELETE are the dangerous operations, so the administrator check
// happens before anything else. A member calling DELETE on a program receives
// 403 Forbidden and nothing is deleted.
// ========================================

import { fail, ok, readJson, serverError } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import {
  canDeleteResource,
  canReadResource,
  canWriteResource,
  deleteRecord,
  updateRecord,
} from '@/lib/api/crud';
import { getResource } from '@/lib/api/resources';
import { assertNotLastAdmin } from '@/lib/api/self-protection';

// ========================================
// GET - READ ONE ROW
// ========================================
export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await context.params;

  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const config = getResource(resource);
  if (!config) return fail(`Unknown admin section: "${resource}".`, 404);

  // Restricted sections (money, loans) check the role on the SERVER.
  if (!canReadResource(config, auth.user.role)) {
    return fail('You are not authorized to view this record.', 403);
  }

  try {
    const row = await config.delegate.findUnique({
      where: { id },
      ...(config.include ? { include: config.include } : {}),
    });

    if (!row) return fail('This item no longer exists.', 404);

    const clean = config.decorate ? config.decorate(row) : row;
    return ok(clean);
  } catch (error) {
    console.error(`[api] read failed for ${resource}:`, error);
    return serverError('Could not load this item.');
  }
}

// ========================================
// PATCH - UPDATE A ROW
// ========================================
export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await context.params;

  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const config = getResource(resource);
  if (!config) return fail(`Unknown admin section: "${resource}".`, 404);

  if (!canWriteResource(config, auth.user.role)) {
    return fail('You are not authorized to change this record.', 403);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const result = await updateRecord(config, id, body, auth.user);

  if (!result.ok) return fail(result.error, result.status, result.fields);
  return ok(result.data, 200, `${config.entity} updated successfully.`);
}

// ========================================
// DELETE - REMOVE A ROW
// ========================================
export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await context.params;

  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const config = getResource(resource);
  if (!config) return fail(`Unknown admin section: "${resource}".`, 404);

  // ---------- Role check ----------
  // Deleting money records is a Super Administrator job (deleteSuperAdminOnly),
  // because removing one changes every total in the reports.
  if (!canDeleteResource(config, auth.user.role)) {
    return fail('You are not authorized to delete this record.', 403);
  }

  // ========================================
  // EXTRA SAFETY FOR MEMBER ACCOUNTS
  // ========================================
  // These rules stop an administrator from locking the organization out of
  // its own panel. They are described in lib/api/self-protection.ts.
  if (resource === 'members') {
    const blocked = await assertNotLastAdmin('delete', id, auth.user.id);
    if (blocked) return fail(blocked, 400);
  }

  const result = await deleteRecord(config, id, auth.user);

  if (!result.ok) return fail(result.error, result.status, result.fields);
  return ok(result.data, 200, `${config.entity} deleted.`);
}
