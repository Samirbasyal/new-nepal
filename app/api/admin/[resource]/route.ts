// ========================================
// API - ADMIN PANEL: LIST AND CREATE
// ========================================
// Addresses:
//   GET  /api/admin/programs      -> list programs (with search and paging)
//   POST /api/admin/programs      -> add a program
//
// The same file serves EVERY section of the Admin Panel (members, programs,
// projects, events, news, gallery, donors, beneficiaries, tasks, ...) because
// each section is described in lib/api/resources.ts.
//
// ========================================
// THIS IS A PROTECTED ROUTE
// ========================================
// The very first line calls requireAdminApi(). That function:
//   1. blocks cross-site requests,
//   2. checks that somebody is signed in, and
//   3. checks that the role is ADMIN.
//
// A normal member calling this address receives:
//   403 { ok: false, error: "You are not authorized to access this page..." }
//
// Hiding the Admin menu link is NOT what protects the panel - THIS is.
// ========================================

import { fail, ok, readJson } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { canReadResource, canWriteResource, createRecord, listRecords } from '@/lib/api/crud';
import { getResource } from '@/lib/api/resources';
import { PAGE_SIZE } from '@/lib/constants';

// Reads the query string, for example:
//   ?search=women&status=ONGOING&page=2&pageSize=20
function readListParams(url: URL) {
  const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? String(PAGE_SIZE), 10);

  return {
    search: url.searchParams.get('search')?.trim() ?? '',
    status: url.searchParams.get('status')?.trim() ?? '',
    filterField: url.searchParams.get('filterField')?.trim() ?? '',
    filterValue: url.searchParams.get('filterValue')?.trim() ?? '',
    sort: url.searchParams.get('sort')?.trim() ?? '',
    // Keep the numbers sensible so a huge pageSize cannot overload the server.
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 100) : PAGE_SIZE,
  };
}

// ========================================
// GET - LIST ROWS
// ========================================
export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  // Wait for the address parameters (Next.js 15 passes them as a Promise).
  const { resource } = await context.params;

  // ---------- Authorization ----------
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const config = getResource(resource);
  if (!config) return fail(`Unknown admin section: "${resource}".`, 404);

  // ---------- Is this role allowed to READ this section? ----------
  // A few sections are restricted (money records and loans, for example).
  // The check is here on the SERVER, so typing the address by hand does not
  // get anybody in.
  if (!canReadResource(config, auth.user.role)) {
    return fail('You are not authorized to view this section.', 403);
  }

  const params = readListParams(new URL(request.url));
  const result = await listRecords(config, params);

  if (!result.ok) return fail(result.error, result.status, result.fields);
  return ok(result.data);
}

// ========================================
// POST - CREATE A NEW ROW
// ========================================
export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;

  // ---------- Authorization ----------
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const config = getResource(resource);
  if (!config) return fail(`Unknown admin section: "${resource}".`, 404);

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const result = await createRecord(config, body, auth.user);

  if (!result.ok) return fail(result.error, result.status, result.fields);
  return ok(result.data, 201, `${config.entity} saved successfully.`);
}
