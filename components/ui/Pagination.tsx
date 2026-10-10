// ========================================
// PAGINATION COMPONENT
// ========================================
// The "Previous / 1 2 3 / Next" control shown under long lists
// (programs, projects, news, events).
// ========================================

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { buildPageHref } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function Pagination({
  basePath,
  page,
  total,
  pageSize,
  params = {},
  className,
}: {
  /** The page address, for example "/programs". */
  basePath: string;
  page: number;
  /** Total number of records in the database. */
  total: number;
  pageSize: number;
  /** Other filters that must stay in the address when changing page. */
  params?: Record<string, string | undefined>;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // Build a short list of page numbers around the current page.
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i += 1) pages.push(i);

  const previousHref = buildPageHref(basePath, params, Math.max(1, page - 1));
  const nextHref = buildPageHref(basePath, params, Math.min(totalPages, page + 1));

  return (
    <nav className={cn('mt-10 flex items-center justify-center gap-1', className)} aria-label="Pagination">
      {/* Previous page */}
      {page > 1 ? (
        <Link
          href={previousHref}
          className="btn btn-outline btn-sm"
          rel="prev"
          aria-label="Go to previous page"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Previous
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm opacity-40" aria-disabled="true">
          <Icon name="chevron-left" className="h-4 w-4" />
          Previous
        </span>
      )}

      {/* Page numbers */}
      <ul className="mx-1 flex items-center gap-1">
        {pages.map((pageNumber) => {
          const isCurrent = pageNumber === page;
          return (
            <li key={pageNumber}>
              <Link
                href={buildPageHref(basePath, params, pageNumber)}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-btn text-sm font-semibold transition-colors',
                  isCurrent
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-700 hover:bg-ink-100',
                )}
              >
                {pageNumber}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Next page */}
      {page < totalPages ? (
        <Link href={nextHref} className="btn btn-outline btn-sm" rel="next" aria-label="Go to next page">
          Next
          <Icon name="chevron-right" className="h-4 w-4" />
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm opacity-40" aria-disabled="true">
          Next
          <Icon name="chevron-right" className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
