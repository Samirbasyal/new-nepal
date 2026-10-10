// ========================================
// NEWS / NOTICES
// This code controls the News listing page.
// ========================================
// Address: /news
//
//   ?type=NEWS    -> only news
//   ?type=NOTICE  -> only notices
//   ?type=PRESS   -> only press releases
//   ?type=STORY   -> only stories
//   (nothing)     -> everything, newest first
//
// Only PUBLISHED articles are shown. They are written in
// Admin Panel -> News & Notices.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { NewsCard } from '@/components/public/Cards';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { PageHero, Section, CardGrid } from '@/components/ui/Section';
import { getNewsPosts } from '@/lib/data/public';
import { NEWS_TYPE_OPTIONS, PAGE_SIZE } from '@/lib/constants';
import { buildPageHref, cn, parsePage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'News and notices',
  description:
    'News, notices and stories from the work of Janakalyan Samataa Yuwa Club.',
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const type = NEWS_TYPE_OPTIONS.some((option) => option.value === params.type)
    ? params.type
    : undefined;

  const news = await getNewsPosts({ page, pageSize: PAGE_SIZE, type });

  return (
    <>
      <PageHero
        eyebrow="News"
        icon="megaphone"
        title="News and notices"
        description="Updates, announcements and stories from our work in the community."
      />

      <Section>
        {/* ========================================
            TYPE FILTER
            ======================================== */}
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Filter by type">
          <Link
            href="/news"
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
              !type
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
            )}
          >
            All
          </Link>

          {NEWS_TYPE_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildPageHref('/news', { type: option.value }, 1)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                type === option.value
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
              )}
            >
              {option.label}
            </Link>
          ))}
        </nav>

        {/* ========================================
            ARTICLE CARDS
            ======================================== */}
        {news.rows.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-ink-500">
              Showing {news.rows.length} of {news.total}{' '}
              {news.total === 1 ? 'article' : 'articles'}.
            </p>

            <CardGrid>
              {news.rows.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </CardGrid>

            <Pagination
              basePath="/news"
              page={news.page}
              total={news.total}
              pageSize={news.pageSize}
              params={{ type }}
            />
          </>
        ) : (
          <EmptyState
            icon="megaphone"
            title="No articles published yet"
            description="News and notices are written in Admin Panel → News & Notices. Switch on 'Published' and the article appears here immediately."
          />
        )}
      </Section>
    </>
  );
}
