// ========================================
// ADMIN PANEL - THE CRUD TABLE
// ========================================
// ONE component that manages every section of the Admin Panel:
// search, filter, page through records, add, edit, delete and
// publish/unpublish.
//
// Each Admin Panel page tells it what to do by passing:
//   - resourceKey : which section this is (also used in the API address)
//   - fields      : the form fields
//   - columns     : the columns of the table
//
// ADD A HOLIDAY        -> use the form
// PUBLISH / UNPUBLISH  -> click the switch in the table
// DELETE               -> press the bin icon and confirm
//
// Everything is sent to /api/admin/<resourceKey>, where the server checks that
// the person is really an ADMINISTRATOR before touching the database.
// ========================================

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ResourceForm } from '@/components/admin/ResourceForm';
import { cn, formatDate, formatDateTime, truncate } from '@/lib/utils';
// Money is always formatted in one place, so every page agrees.
import { formatMoney } from '@/lib/fund/calc';
import type { AdminErrorResponse, AdminListResponse, AdminRow, ColumnConfig, FieldConfig } from '@/components/admin/types';

/**
 * Read a value from a record, following dots.
 * Example: readPath({ assignedTo: { name: 'Ram' } }, 'assignedTo.name') -> "Ram"
 * Used so a table column can show a value from a related record.
 */
function readPath(row: AdminRow, path: string): unknown {
  if (!path.includes('.')) return row[path];

  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, row);
}

export function ResourceManager({
  resourceKey,
  entityLabel,
  title,
  description,
  fields,
  columns,
  /** Options for the status drop-down in the toolbar. */
  statusOptions,
  /** Which column the status filter sends (for example "status" or "type"). */
  statusField,
  /** Which column the publish switch toggles. Default: isPublished */
  publishField = 'isPublished',
  /** Values used when adding a new record. */
  defaults,
  /** Hide the "Add" button for read-only sections. */
  canCreate = true,
  /** Hide the pencil (edit) button for read-only sections. */
  canEdit = true,
  canDelete = true,
  pageSize = 12,
}: {
  resourceKey: string;
  entityLabel: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  statusOptions?: { value: string; label: string }[];
  statusField?: string;
  publishField?: string;
  defaults?: AdminRow;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  pageSize?: number;
}) {
  // ---------- List state ----------
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ---------- Toolbar state ----------
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // ---------- Messages ----------
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // ---------- Edit / create panel ----------
  const [editing, setEditing] = useState<AdminRow | null | undefined>(undefined);
  // undefined = closed, null = creating a new record, object = editing that row

  // ---------- Busy row (for the publish switch and delete button) ----------
  const [busyId, setBusyId] = useState<string | null>(null);

  const isFirstRender = useRef(true);

  // ========================================
  // SEARCH DEBOUNCE
  // Wait a moment after the user stops typing, so we do not send a request
  // for every single letter.
  // ========================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ========================================
  // LOAD THE LIST
  // ========================================
  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);

    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search) query.set('search', search);
    if (status) query.set('status', status);

    try {
      const response = await fetch(`/api/admin/${resourceKey}?${query.toString()}`, {
        // Always fetch fresh data.
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as
        | AdminListResponse
        | AdminErrorResponse
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setRows([]);
        setTotal(0);
        setListError(
          (payload && 'error' in payload && payload.error) ||
            'Could not load the list. Please refresh the page.',
        );
        return;
      }

      setRows(payload.data.rows);
      setTotal(payload.data.total);
    } catch {
      setRows([]);
      setTotal(0);
      setListError('Could not reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [resourceKey, page, pageSize, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  // Hide the success message automatically after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Scroll to the top when the page or the search changes (not on first load).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, search, status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ========================================
  // PUBLISH / UNPUBLISH (a single value is sent - the API accepts partial updates)
  // ========================================
  async function togglePublish(row: AdminRow) {
    const id = String(row.id);
    const nextValue = !Boolean(row[publishField]);

    setBusyId(id);
    setProblem(null);

    try {
      const response = await fetch(`/api/admin/${resourceKey}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [publishField]: nextValue }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | AdminErrorResponse
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setProblem(
          (payload && 'error' in payload && payload.error) || 'Could not change this setting.',
        );
        return;
      }

      // Update the row in place so the table feels instant.
      setRows((current) =>
        current.map((item) => (String(item.id) === id ? { ...item, [publishField]: nextValue } : item)),
      );

      setNotice(
        nextValue
          ? `${entityLabel} is now published and visible on the website.`
          : `${entityLabel} is now hidden from the website.`,
      );
    } catch {
      setProblem('Could not reach the server.');
    } finally {
      setBusyId(null);
    }
  }

  // ========================================
  // DELETE
  // ========================================
  async function remove(row: AdminRow) {
    const label = String(row.title ?? row.name ?? row.fullName ?? row.donorName ?? row.id);

    // Always confirm - deleting cannot be undone.
    const confirmed = window.confirm(
      `Delete this ${entityLabel.toLowerCase()}?\n\n"${truncate(label, 80)}"\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(String(row.id));
    setProblem(null);

    try {
      const response = await fetch(`/api/admin/${resourceKey}/${String(row.id)}`, {
        method: 'DELETE',
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | AdminErrorResponse
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        setProblem(
          (payload && 'error' in payload && payload.error) || 'Could not delete this item.',
        );
        return;
      }

      setNotice(payload.message || `${entityLabel} deleted.`);
      await load();
    } catch {
      setProblem('Could not reach the server.');
    } finally {
      setBusyId(null);
    }
  }

  // ========================================
  // RENDER A CELL
  // ========================================
  const renderCell = useMemo(
    () =>
      (column: ColumnConfig, row: AdminRow) => {
        // "assignedTo.name" style names let a column read a value from a
        // related record, for example the name of the member a task belongs to.
        const value = readPath(row, column.name);

        // ---------- Publish switch ----------
        if (column.toggle) {
          const on = Boolean(value);
          const id = String(row.id);
          const busy = busyId === id;

          return (
            <button
              type="button"
              onClick={() => void togglePublish(row)}
              disabled={busy}
              aria-pressed={on}
              title={on ? 'Click to hide from the website' : 'Click to publish'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors',
                busy && 'opacity-60',
                on
                  ? 'bg-green-50 text-green-700 ring-green-200 hover:bg-green-100'
                  : 'bg-ink-100 text-ink-600 ring-ink-200 hover:bg-ink-200',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  on ? 'bg-green-600' : 'bg-ink-400',
                )}
              />
              {on ? 'Published' : 'Hidden'}
            </button>
          );
        }

        if (value === null || value === undefined || value === '') {
          return <span className="text-ink-300">—</span>;
        }

        switch (column.type) {
          case 'badge':
            return <StatusBadge status={String(value)} />;

          case 'boolean':
            return (
              <span className={cn('font-medium', value ? 'text-green-700' : 'text-ink-500')}>
                {value ? 'Yes' : 'No'}
              </span>
            );

          case 'date':
            return <span className="whitespace-nowrap">{formatDate(value as string)}</span>;

          case 'datetime':
            return <span className="whitespace-nowrap">{formatDateTime(value as string)}</span>;

          case 'number':
            return <span>{String(value)}</span>;

          case 'money':
            // Money is shown the way the office writes it: Rs. 1,25,000
            // (the same formatter is used on every page of this project).
            return (
              <span className="whitespace-nowrap font-medium">
                {formatMoney(Number(value ?? 0))}
              </span>
            );

          case 'link': {
            // A value that opens another page, for example a loan number that
            // opens that loan's full record (repayments, agreement, decisions).
            const template = column.hrefTemplate ?? '';
            const href = template.includes('{id}')
              ? template.replace('{id}', String(row.id ?? ''))
              : template;

            return (
              <Link href={href} className="font-semibold text-brand-700 hover:underline">
                {String(value)}
              </Link>
            );
          }

          case 'image':
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={String(value)}
                alt=""
                className="h-10 w-14 rounded object-cover ring-1 ring-ink-200"
                loading="lazy"
              />
            );

          case 'longtext':
            return <span className="text-ink-600">{truncate(String(value), 90)}</span>;

          default:
            return <span className="font-medium text-ink-800">{String(value)}</span>;
        }
      },
    [busyId, entityLabel, publishField, resourceKey],
  );

  // ========================================
  // THE PAGE
  // ========================================
  return (
    <div className="space-y-6">
      {/* ========================================
          HEADING
          ======================================== */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
        </div>

        {canCreate ? (
          <Button variant="primary" onClick={() => setEditing(null)}>
            <Icon name="plus" className="h-4 w-4" />
            Add new
          </Button>
        ) : null}
      </header>

      {/* ========================================
          MESSAGES
          ======================================== */}
      {notice ? (
        <Alert tone="success">
          {notice}
        </Alert>
      ) : null}

      {problem ? (
        <Alert tone="error">
          {problem}
        </Alert>
      ) : null}

      {/* ========================================
          TOOLBAR: SEARCH + FILTER
          ======================================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="input pl-9"
            aria-label={`Search ${title}`}
          />
        </div>

        {statusOptions && statusField ? (
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <span className="whitespace-nowrap">Filter:</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="input py-2"
            >
              <option value="">All</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <Icon name="refresh" className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ========================================
          THE TABLE
          ======================================== */}
      {listError ? (
        <Alert tone="error" title="Could not load this list">
          {listError}
        </Alert>
      ) : null}

      {loading ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-500">Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="folder"
          title={search || status ? 'No matching records' : `No ${title.toLowerCase()} yet`}
          description={
            search || status
              ? 'Try a different search word, or clear the filter to see everything.'
              : canCreate
                ? `Press "Add new" to create the first one. Nothing appears on the public website until you switch on "Published".`
                : 'Nothing has been recorded here yet.'
          }
          action={
            canCreate && !search && !status ? (
              <Button variant="primary" onClick={() => setEditing(null)}>
                <Icon name="plus" className="h-4 w-4" />
                Add new
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          {/* The table scrolls sideways on a small screen instead of breaking the layout */}
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.name}
                      className={column.hideOnMobile ? 'hidden lg:table-cell' : undefined}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const id = String(row.id);
                  const busy = busyId === id;

                  return (
                    <tr key={id} className={busy ? 'opacity-60' : undefined}>
                      {columns.map((column, index) => (
                        <td
                          key={column.name}
                          className={cn(
                            column.hideOnMobile && 'hidden lg:table-cell',
                            // Make the first column stand out a little.
                            index === 0 && 'font-semibold text-ink-900',
                          )}
                        >
                          {renderCell(column, row)}
                        </td>
                      ))}

                      <td className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => setEditing(row)}
                              className="rounded-btn p-2 text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                              title="Edit"
                              aria-label={`Edit ${String(row.title ?? row.name ?? '')}`}
                            >
                              <Icon name="edit" className="h-4 w-4" />
                            </button>
                          ) : null}

                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => void remove(row)}
                              disabled={busy}
                              className="rounded-btn p-2 text-ink-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                              aria-label={`Delete ${String(row.title ?? row.name ?? '')}`}
                            >
                              <Icon name="trash" className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ---------- Footer with the record count and paging ---------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-ink-50 px-4 py-3">
            <p className="text-xs text-ink-500">
              Showing {rows.length} of {total} {total === 1 ? 'record' : 'records'}
              {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
            </p>

            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="btn btn-outline btn-sm"
                >
                  <Icon name="chevron-left" className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="btn btn-outline btn-sm"
                >
                  Next
                  <Icon name="chevron-right" className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================
          HELP NOTE
          ======================================== */}
      <p className="text-xs text-ink-500">
        Everything you change here is saved to the database immediately and appears on the public
        website as soon as it is published. You do not need to edit any code.
      </p>

      {/* ========================================
          THE EDIT / CREATE PANEL
          ======================================== */}
      {editing !== undefined ? (
        <ResourceForm
          resourceKey={resourceKey}
          entityLabel={entityLabel}
          fields={fields}
          row={editing}
          defaults={defaults}
          onClose={() => setEditing(undefined)}
          onSaved={async (message) => {
            setEditing(undefined);
            setNotice(message);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}
