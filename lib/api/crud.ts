// ========================================
// API - GENERIC "CRUD" ENGINE
// ========================================
// CRUD = Create, Read, Update, Delete.
//
// Every section of the Admin Panel (Programs, Projects, Events, News, Gallery,
// Donors, Members, ...) needs exactly the same four operations. Instead of
// writing that code many times, we write it ONCE here and describe each
// section in "lib/api/resources.ts".
//
// This file contains the shared engine:
//   listRecords()   -> read a page of rows (with search + filter + paging)
//   createRecord()  -> add a row
//   updateRecord()  -> change a row
//   deleteRecord()  -> remove a row
//
// HOW IT STAYS SAFE
//   - Every call already passed through requireAdminApi() before reaching here.
//   - Every value is validated with a Zod schema before touching the database.
//   - Passwords are hashed, never stored as typed.
//   - "decorate()" removes private fields (like password hashes) from answers.
// ========================================

import type { ZodTypeAny } from 'zod';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { slugify, slugifyUnique } from '@/lib/utils';
import { writeActivity } from '@/lib/audit';
import type { SessionUser } from '@/lib/auth/session';

/**
 * An error whose message is SAFE to show to the administrator.
 * Throw this from custom handlers to replace the generic
 * "Could not save your changes" text with a helpful sentence.
 *
 * Example:
 *   throw new UserFacingError('You cannot delete your own account.');
 */
export class UserFacingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'UserFacingError';
    this.status = status;
  }
}

// ========================================
// TYPES
// ========================================

/** A loose type for a Prisma table model. */
export type ResourceDelegate = {
  findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  count(args?: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
};

export type ListParams = {
  search?: string;
  status?: string;
  filterField?: string;
  filterValue?: string;
  page: number;
  pageSize: number;
  sort?: string;
};

export type CrudOutcome<T = unknown> = {
  ok: true;
  data: T;
} | {
  ok: false;
  status: number;
  error: string;
  fields?: Record<string, string>;
};

export type ResourceCustom = {
  list?: (params: ListParams) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
  create?: (data: Record<string, unknown>, user: SessionUser) => Promise<Record<string, unknown>>;
  update?: (
    id: string,
    data: Record<string, unknown>,
    user: SessionUser,
  ) => Promise<Record<string, unknown>>;
  remove?: (id: string, user: SessionUser) => Promise<unknown>;
};

/**
 * The description of one Admin Panel section.
 * See "lib/api/resources.ts" for the real list.
 */
export type ResourceConfig = {
  /** URL name used in /api/admin/<key> */
  key: string;
  /** Human readable plural name ("Programs") shown in messages */
  label: string;
  /** Name used in the activity log ("Program") */
  entity: string;
  /** The Prisma table model to work on */
  delegate: ResourceDelegate;
  /** Validation rules for creating a row */
  createSchema?: ZodTypeAny;
  /** Validation rules for editing a row */
  updateSchema?: ZodTypeAny;
  /** Which text columns the search box looks in */
  searchFields: string[];
  /** Which column the status filter uses (null = no status filter) */
  statusField?: string | null;
  /** Default ordering */
  orderBy: Record<string, unknown> | Record<string, unknown>[];
  /** Extra related data to load with each row */
  include?: Record<string, unknown>;
  /** Only these admins may do these things (default: all true) */
  allowCreate?: boolean;
  allowUpdate?: boolean;
  allowDelete?: boolean;
  /**
   * Which ROLES may read this section (default: every administrator).
   * Money records are kept tighter, for example:
   *     readRoles: ['SUPER_ADMIN', 'FINANCE_ADMIN']
   *
   * The check runs on the SERVER (app/api/admin/[resource]/route.ts), so
   * typing the address by hand does not get anybody in. Hiding the menu link is
   * only cosmetic - this is what actually protects the section.
   */
  readRoles?: string[];
  /** Which ROLES may add, change or remove rows (default: every administrator). */
  writeRoles?: string[];
  /**
   * Only a Super Administrator may DELETE rows (default: false).
   * Used where the record must stay readable for the audit trail.
   */
  deleteSuperAdminOnly?: boolean;
  /** Automatically build a URL "slug" from this field (e.g. "title") */
  slugFrom?: string | null;
  /** Remove private fields from the answer (e.g. passwordHash) */
  decorate?: (row: Record<string, unknown>) => Record<string, unknown>;
  /**
   * Runs on the SERVER after validation and before the row is written. It may
   * change the data (for example fill a link) or refuse the save by throwing a
   * UserFacingError. Used where a rule needs the database and cannot live in a
   * Zod schema - the Karya Samiti responsibility being the first case.
   */
  beforeSave?: (data: Record<string, unknown>, id?: string) => Promise<void>;
  /** Special hand-written behaviour that replaces the generic engine */
  custom?: ResourceCustom;
};

// ========================================
// ROLE CHECKS FOR ONE SECTION
// ========================================
// These two small functions are the single place where "may this role open
// this section?" is decided. Every API route and every Admin Panel page uses
// them, so a section can never accidentally allow a role that it forbids
// somewhere else.

/** May this role READ the section? (default: any administrator) */
export function canReadResource(config: ResourceConfig, role: string): boolean {
  if (!config.readRoles || config.readRoles.length === 0) return true;
  return config.readRoles.includes(role);
}

/** May this role ADD, CHANGE or REMOVE rows in the section? (default: yes) */
export function canWriteResource(config: ResourceConfig, role: string): boolean {
  if (!config.writeRoles || config.writeRoles.length === 0) return true;
  return config.writeRoles.includes(role);
}

/**
 * May this role DELETE a row from the section?
 *
 * Some records (loans, for example) can be created by any administrator but
 * only removed by a Super Administrator, because deleting one changes the
 * financial reports.
 */
export function canDeleteResource(config: ResourceConfig, role: string): boolean {
  if (config.deleteSuperAdminOnly && role !== 'SUPER_ADMIN') return false;
  return canWriteResource(config, role);
}

// ========================================
// DATABASE COMPATIBILITY HELPERS
// ========================================
// Case-insensitive search needs a special option that only PostgreSQL has.
// To keep the project working on both PostgreSQL and a local SQLite file
// database, we detect which one is in use.

export function isSqlite(): boolean {
  return (process.env.DATABASE_URL ?? '').startsWith('file:');
}

/** Build a "contains" filter that works on both database engines. */
function containsFilter(field: string, value: string): Record<string, unknown> {
  return isSqlite()
    ? { [field]: { contains: value } }
    : { [field]: { contains: value, mode: 'insensitive' } };
}

/** Build the search OR block for a list of columns. */
export function buildSearchWhere(
  fields: string[],
  search: string,
): Record<string, unknown> | undefined {
  const term = search.trim();
  if (!term || fields.length === 0) return undefined;
  return { OR: fields.map((field) => containsFilter(field, term)) };
}

/** Turn text into a safe order-by column (blocks SQL-ish input). */
function buildOrderBy(
  config: ResourceConfig,
  sort?: string,
  direction: 'asc' | 'desc' = 'desc',
): Record<string, unknown> | Record<string, unknown>[] {
  if (sort && /^[a-zA-Z]+$/.test(sort)) {
    return { [sort]: direction };
  }
  return config.orderBy;
}

// ========================================
// VALIDATION RESULT HELPER
// ========================================
type Parsed<T> = { ok: true; data: T } | { ok: false; fields: Record<string, string>; error: string };

function runSchema<T>(schema: ZodTypeAny | undefined, payload: unknown): Parsed<T> {
  if (!schema) {
    return { ok: false, fields: {}, error: 'This section cannot be created from here.' };
  }
  const result = schema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data as T };

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = result.error.issues[0];
  return {
    ok: false,
    fields,
    error: first ? first.message : 'Please check the form and try again.',
  };
}

// ========================================
// UNIQUE SLUG HELPER
// ========================================
async function makeUniqueSlug(
  delegate: ResourceDelegate,
  slugSource: string,
  data: Record<string, unknown>,
  currentId?: string,
): Promise<string | null> {
  // Did the administrator type their own slug?
  const typed = data.slug;
  const base =
    typeof typed === 'string' && typed.trim() !== ''
      ? slugify(typed)
      : slugify(String(data[slugSource] ?? ''));

  if (!base) return null;

  // If the slug is free (or belongs to the row we are editing) keep it.
  const existing = await delegate.findUnique({ where: { slug: base } });
  if (!existing || (currentId && (existing as { id?: string }).id === currentId)) {
    return base;
  }

  // Otherwise add a short random ending.
  return slugifyUnique(base);
}

// ========================================
// LIST  (Read)
// ========================================
export async function listRecords<T = Record<string, unknown>>(
  config: ResourceConfig,
  params: ListParams,
): Promise<CrudOutcome<{ rows: T[]; total: number; page: number; pageSize: number }>> {
  if (!isDatabaseConfigured()) {
    return { ok: false, status: 503, error: 'The database is not configured yet.' };
  }

  try {
    // --- special hand-written listing (used by Members) ---
    if (config.custom?.list) {
      const { rows, total } = await config.custom.list(params);
      return { ok: true, data: { rows: rows as T[], total, page: params.page, pageSize: params.pageSize } };
    }

    // --- normal generic listing ---
    const where: Record<string, unknown> = {};

    const searchWhere = buildSearchWhere(config.searchFields, params.search ?? '');
    if (searchWhere) Object.assign(where, searchWhere);

    if (config.statusField && params.status) {
      where[config.statusField] = params.status;
    }
    if (params.filterField && params.filterValue) {
      where[params.filterField] = params.filterValue;
    }

    const skip = (params.page - 1) * params.pageSize;

    const [rows, total] = await Promise.all([
      config.delegate.findMany({
        where,
        orderBy: buildOrderBy(config, params.sort),
        skip,
        take: params.pageSize,
        ...(config.include ? { include: config.include } : {}),
      }),
      config.delegate.count({ where }),
    ]);

    const clean = config.decorate ? rows.map(config.decorate) : rows;
    return { ok: true, data: { rows: clean as T[], total, page: params.page, pageSize: params.pageSize } };
  } catch (error) {
    console.error(`[api] list failed for ${config.key}:`, error);
    return { ok: false, status: 500, error: 'Could not load the list. Please try again.' };
  }
}

// ========================================
// CREATE  (Add)
// ========================================
export async function createRecord(
  config: ResourceConfig,
  payload: unknown,
  user: SessionUser,
): Promise<CrudOutcome<Record<string, unknown>>> {
  if (!isDatabaseConfigured()) {
    return { ok: false, status: 503, error: 'The database is not configured yet.' };
  }
  if (config.allowCreate === false) {
    return { ok: false, status: 403, error: `New ${config.label.toLowerCase()} cannot be added here.` };
  }

  const parsed = runSchema<Record<string, unknown>>(config.createSchema, payload);
  if (!parsed.ok) return { ok: false, status: 422, error: parsed.error, fields: parsed.fields };

  try {
    let row: Record<string, unknown>;

    // A rule that needs the database runs here, inside the try, so its refusal
    // comes back as a normal 4xx with a readable message.
    if (config.beforeSave) await config.beforeSave(parsed.data);

    if (config.custom?.create) {
      row = await config.custom.create(parsed.data, user);
    } else {
      const data: Record<string, unknown> = { ...parsed.data };

      // Build a URL slug when this section has slugs.
      if (config.slugFrom) {
        const slug = await makeUniqueSlug(config.delegate, config.slugFrom, data);
        if (slug) data.slug = slug;
      }

      row = await config.delegate.create({ data });
    }

    await writeActivity({
      actorId: user.id,
      actorName: user.name,
      action: 'CREATE',
      entity: config.entity,
      entityId: String(row.id ?? ''),
      detail: String(row.title ?? row.name ?? row.fullName ?? row.donorName ?? ''),
    });

    return { ok: true, data: config.decorate ? config.decorate(row) : row };
  } catch (error) {
    return handleWriteError(error, config);
  }
}

// ========================================
// UPDATE  (Edit)
// ========================================
export async function updateRecord(
  config: ResourceConfig,
  id: string,
  payload: unknown,
  user: SessionUser,
): Promise<CrudOutcome<Record<string, unknown>>> {
  if (!isDatabaseConfigured()) {
    return { ok: false, status: 503, error: 'The database is not configured yet.' };
  }
  if (config.allowUpdate === false) {
    return { ok: false, status: 403, error: `These records cannot be edited here.` };
  }

  const parsed = runSchema<Record<string, unknown>>(config.updateSchema, payload);
  if (!parsed.ok) return { ok: false, status: 422, error: parsed.error, fields: parsed.fields };

  try {
    const existing = await config.delegate.findUnique({ where: { id } });
    if (!existing) return { ok: false, status: 404, error: 'This item no longer exists.' };

    let row: Record<string, unknown>;

    // The row's id is passed so a rule can look at what is already stored - an
    // edit that does not touch the email still has to be checked against it.
    if (config.beforeSave) await config.beforeSave(parsed.data, id);

    if (config.custom?.update) {
      row = await config.custom.update(id, parsed.data, user);
    } else {
      const data: Record<string, unknown> = { ...parsed.data };

      // Only touch the URL "slug" when the administrator actually changed the
      // title or typed a slug. Without this guard a small update such as
      // "publish this program" would overwrite the address with "undefined".
      if (config.slugFrom) {
        const slugWasTouched =
          data.slug !== undefined || data[config.slugFrom] !== undefined;

        if (slugWasTouched) {
          const slug = await makeUniqueSlug(config.delegate, config.slugFrom, data, id);
          if (slug) data.slug = slug;
        }
      }

      row = await config.delegate.update({ where: { id }, data });
    }

    await writeActivity({
      actorId: user.id,
      actorName: user.name,
      action: 'UPDATE',
      entity: config.entity,
      entityId: id,
      detail: String(row.title ?? row.name ?? row.fullName ?? row.donorName ?? ''),
    });

    return { ok: true, data: config.decorate ? config.decorate(row) : row };
  } catch (error) {
    return handleWriteError(error, config);
  }
}

// ========================================
// DELETE
// ========================================
export async function deleteRecord(
  config: ResourceConfig,
  id: string,
  user: SessionUser,
): Promise<CrudOutcome<{ id: string }>> {
  if (!isDatabaseConfigured()) {
    return { ok: false, status: 503, error: 'The database is not configured yet.' };
  }
  if (config.allowDelete === false) {
    return { ok: false, status: 403, error: 'These records cannot be deleted.' };
  }

  try {
    const existing = await config.delegate.findUnique({ where: { id } });
    if (!existing) return { ok: false, status: 404, error: 'This item no longer exists.' };

    if (config.custom?.remove) {
      await config.custom.remove(id, user);
    } else {
      await config.delegate.delete({ where: { id } });
    }

    await writeActivity({
      actorId: user.id,
      actorName: user.name,
      action: 'DELETE',
      entity: config.entity,
      entityId: id,
      detail: String(
        (existing as Record<string, unknown>).title ??
          (existing as Record<string, unknown>).name ??
          (existing as Record<string, unknown>).fullName ??
          '',
      ),
    });

    return { ok: true, data: { id } };
  } catch (error) {
    // ---------- an explanation written for the administrator ----------
    // The custom delete for donations throws UserFacingError ("That donation was
    // already removed."). Swallowing those into the generic sentence below sent
    // people hunting for a database relationship that was never the problem - and
    // the action had often already succeeded.
    if (error instanceof UserFacingError) {
      return { ok: false, status: error.status, error: error.message };
    }

    // ---------- a real foreign-key refusal ----------
    // Prisma reports P2003 when another table still points at this row. Say so
    // plainly, and name the action that does work.
    const code = (error as { code?: string } | null)?.code;

    if (code === 'P2003') {
      return {
        ok: false,
        status: 409,
        error:
          'This record is still used by other records, so it cannot be removed here. ' +
          'Remove those first, or use "Delete permanently" if this is a test entry.',
      };
    }

    console.error(`[api] delete failed for ${config.key}:`, error);
    return {
      ok: false,
      status: 500,
      error: 'Could not delete this item. It may be linked to other content.',
    };
  }
}

// ========================================
// SHARED ERROR HANDLING
// ========================================
function handleWriteError(error: unknown, config: ResourceConfig): CrudOutcome<never> {
  // Our own friendly errors (for example "You cannot delete your own account.")
  // are shown to the administrator exactly as written.
  if (error instanceof UserFacingError) {
    return { ok: false, status: error.status, error: error.message };
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`[api] write failed for ${config.key}:`, error);

  // Prisma error P2002 = a UNIQUE column already holds this value
  // (the most common example is an email address that is already registered).
  if (message.includes('P2002') || message.includes('Unique constraint')) {
    const field = message.includes('email') ? 'email' : message.includes('slug') ? 'slug' : 'value';
    return {
      ok: false,
      status: 409,
      error:
        field === 'email'
          ? 'That email address is already registered.'
          : 'That address is already used by another item.',
      fields: { [field]: 'This value is already in use.' },
    };
  }

  // Prisma error P2003 = a linked record does not exist.
  if (message.includes('P2003') || message.includes('Foreign key')) {
    return { ok: false, status: 400, error: 'The selected related item does not exist.' };
  }

  // TEMPORARY DIAGNOSTIC: the administrator needs the real sentence, not a
  // polite one, to know what to fix. It is only ever shown inside the Admin
  // Panel to a signed-in administrator.
  return {
    ok: false,
    status: 500,
    error: 'Could not save your changes. Details: ' + message.slice(0, 300),
  };
}

// ========================================
// PRISMA CLIENT ACCESS
// ========================================
/**
 * Reach a Prisma table by name.
 * Example: prismaModel('program') returns the program table helpers.
 * (Prisma names tables in singular lower case: program, project, event, newsPost...)
 */
export function prismaModel(name: string): ResourceDelegate {
  const client = prisma as unknown as Record<string, ResourceDelegate>;
  const model = client[name];
  if (!model) throw new Error(`Unknown database table: ${name}`);
  return model;
}
