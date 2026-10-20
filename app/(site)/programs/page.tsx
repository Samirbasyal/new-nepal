// ========================================
// PROGRAMS SECTION
// This code controls Programs (the list page).
// ========================================
// Address: /programs
//
// FEATURES
//   - shows only PUBLISHED programs (isPublished = true)
//   - category filter (the category list is built from the data itself,
//     so nothing is hard-coded)
//   - pagination
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
import { ProgramCard } from '@/components/public/ProgramCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { PageHero, Section, CardGrid } from '@/components/ui/Section';
import { getProgramCategories, getPrograms } from '@/lib/data/public';
import { PAGE_SIZE } from '@/lib/constants';
import { buildPageHref, cn, parsePage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Programs',
  description:
    'Programs run by Janakalyan Samataa Yuwa Club - education, health, women empowerment, youth leadership and community development.',
};

export default async function ProgramsPage({
  searchParams,
}: {
  // In Next.js 15 the search parameters arrive as a Promise.
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  
  const lang = await getLanguage();
const params = await searchParams;
  const page = parsePage(params.page);
  const category = params.category?.trim() || undefined;

  const [programs, categories] = await Promise.all([
    getPrograms({ page, pageSize: PAGE_SIZE, category }),
    getProgramCategories(),
  ]);

  return (
    <>
      <PageHero
        eyebrow={t(lang, 'programs.eyebrow')}
        icon="layers"
        title={t(lang, 'programs.title')}
        description="Programs and activities carried out together with the community."
      />

      <Section>
        {/* ========================================
            CATEGORY FILTER
            The list of categories is built from the published programs, so it
            always matches the real content.
            ======================================== */}
        {categories.length > 0 ? (
          <nav className="mb-8 flex flex-wrap gap-2" aria-label="Filter programs by category">
            <Link
              href="/programs"
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                !category
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
              )}
            >
              All programs
            </Link>

            {categories.map((item) => (
              <Link
                key={item}
                href={buildPageHref('/programs', { category: item }, 1)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                  category === item
                    ? 'bg-brand-600 text-white ring-brand-600'
                    : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
                )}
              >
                {item}
              </Link>
            ))}
          </nav>
        ) : null}

        {/* ========================================
            PROGRAM CARDS
            ======================================== */}
        {programs.rows.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-ink-500">
              Showing {programs.rows.length} of {programs.total}{' '}
              {programs.total === 1 ? 'program' : 'programs'}
              {category ? ` in “${category}”` : ''}.
            </p>

            <CardGrid>
              {programs.rows.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </CardGrid>

            <Pagination
              basePath="/programs"
              page={programs.page}
              total={programs.total}
              pageSize={programs.pageSize}
              params={{ category }}
            />
          </>
        ) : (
          <EmptyState
            icon="layers"
            title={category ? `No programs in “${category}” yet` : 'No programs published yet'}
            description="Programs are added from the Admin Panel and appear here as soon as they are published. Add the first one from Admin Panel → Programs."
          />
        )}
      </Section>
    </>
  );
}
