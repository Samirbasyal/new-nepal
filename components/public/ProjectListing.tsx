// ========================================
// PROJECTS / OUR WORKS - SHARED LISTING
// ========================================
// The /projects page and the /our-works page show exactly the same kind of
// content. The only difference is which entries they display:
//
//   kind = "PROJECT"  ->  /projects
//   kind = "WORK"     ->  /our-works
//
// So both pages use this one component and simply pass a different "kind".
// That keeps the two pages identical in behaviour and halves the code to
// maintain.
// ========================================

import Link from 'next/link';
import { ProjectCard } from '@/components/public/ProjectCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { PageHero, Section, CardGrid } from '@/components/ui/Section';
import { getProjects } from '@/lib/data/public';
import { PAGE_SIZE, PROJECT_STATUS_OPTIONS } from '@/lib/constants';
import { buildPageHref, cn, parsePage } from '@/lib/utils';

export async function ProjectListing({
  kind,
  basePath,
  eyebrow,
  title,
  description,
  emptyTitle,
  searchParams,
}: {
  kind: 'PROJECT' | 'WORK';
  /** The page address, "/projects" or "/our-works". */
  basePath: string;
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  /** The ?page= and ?status= values from the address bar. */
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const status = params.status?.trim() || undefined;

  const projects = await getProjects({ kind, page, pageSize: PAGE_SIZE, status });

  return (
    <>
      <PageHero eyebrow={eyebrow} icon="briefcase" title={title} description={description} />

      <Section>
        {/* ========================================
            STATUS FILTER
            ======================================== */}
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Filter by status">
          <Link
            href={basePath}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
              !status
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
            )}
          >
            All
          </Link>

          {PROJECT_STATUS_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildPageHref(basePath, { status: option.value }, 1)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                status === option.value
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
              )}
            >
              {option.label}
            </Link>
          ))}
        </nav>

        {/* ========================================
            CARDS
            ======================================== */}
        {projects.rows.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-ink-500">
              Showing {projects.rows.length} of {projects.total}{' '}
              {projects.total === 1 ? 'entry' : 'entries'}.
            </p>

            <CardGrid>
              {projects.rows.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </CardGrid>

            <Pagination
              basePath={basePath}
              page={projects.page}
              total={projects.total}
              pageSize={projects.pageSize}
              params={{ status }}
            />
          </>
        ) : (
          <EmptyState
            icon="briefcase"
            title={emptyTitle}
            description={`Add entries from Admin Panel → Projects & Our Works, choose type "${
              kind === 'WORK' ? 'Our Work' : 'Project'
            }" and switch on "Published". They will then appear on this page.`}
          />
        )}
      </Section>
    </>
  );
}
