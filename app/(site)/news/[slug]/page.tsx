// ========================================
// NEWS / NOTICES
// This code controls a single article page.
// ========================================
// Address: /news/<address-of-the-article>
//
// Shows the featured image, the type badge, the date, the full article text
// and a list of other recent articles.
//
// HOW TO WRITE AN ARTICLE
//   In the Admin Panel you type plain text. Blank lines create a new
//   paragraph, and "**word**" makes a word bold. No HTML is needed (and HTML
//   is not interpreted, which keeps the page safe).
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Thumb } from '@/components/public/Thumb';
import { Container, Section } from '@/components/ui/Section';
import { getNewsBySlug, getNewsPosts } from '@/lib/data/public';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);

  if (!post) return { title: 'Article not found' };

  return {
    title: post.title,
    description: post.excerpt || post.content?.slice(0, 160) || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
      type: 'article',
    },
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);

  if (!post) notFound();

  // "More from us" - the next few published articles.
  const others = await getNewsPosts({ pageSize: 4 });
  const related = others.rows.filter((item) => item.id !== post.id).slice(0, 3);

  // Blank lines separate paragraphs.
  const paragraphs = (post.content ?? '').split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <article>
        <header className="border-b border-ink-200 bg-ink-50">
          <Container className="py-8 sm:py-10">
            <nav className="mb-4 text-sm text-ink-500" aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-brand-700">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/news" className="hover:text-brand-700">
                    News
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="font-medium text-ink-700">{post.title}</li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={post.type} />
              {post.category ? (
                <span className="text-xs font-medium text-ink-500">{post.category}</span>
              ) : null}
            </div>

            <h1 className="mt-3 max-w-4xl font-display text-2xl font-bold leading-tight text-ink-900 sm:text-3xl lg:text-4xl">
              {post.title}
            </h1>

            {post.publishedAt ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-500">
                <Icon name="calendar" className="h-4 w-4" />
                {formatDate(post.publishedAt)}
              </p>
            ) : null}
          </Container>
        </header>

        <Section>
          <div className="mx-auto max-w-3xl">
            {/* ---------- Featured image ---------- */}
            {post.coverImageUrl ? (
              <div className="mb-8 overflow-hidden rounded-card">
                <Thumb
                  src={post.coverImageUrl}
                  alt={post.title}
                  ratio="aspect-[16/9]"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              </div>
            ) : null}

            {/* ---------- Short summary ---------- */}
            {post.excerpt ? (
              <p className="mb-6 border-l-4 border-brand-500 pl-4 text-lg font-medium leading-relaxed text-ink-700">
                {post.excerpt}
              </p>
            ) : null}

            {/* ---------- Full article ---------- */}
            {paragraphs.length > 0 ? (
              <div className="prose-content">
                {paragraphs.map((paragraph, index) => {
                  // A line that starts with "# " becomes a small heading, so
                  // administrators can break up a long article easily.
                  if (paragraph.startsWith('# ')) {
                    return (
                      <h2 key={index} className="mt-8 mb-3 text-xl font-bold text-ink-900">
                        {paragraph.replace(/^#\s*/, '')}
                      </h2>
                    );
                  }

                  if (paragraph.startsWith('- ')) {
                    return (
                      <ul key={index} className="mb-4 list-disc space-y-1 pl-6">
                        {paragraph
                          .split('\n')
                          .filter((line) => line.trim().startsWith('-'))
                          .map((line, lineIndex) => (
                            <li key={lineIndex}>{line.replace(/^-\s*/, '')}</li>
                          ))}
                      </ul>
                    );
                  }

                  // "**bold**" support.
                  const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={index}>
                      {parts.map((part, partIndex) =>
                        part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
                          <strong key={partIndex}>{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={partIndex}>{part}</span>
                        ),
                      )}
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm italic text-ink-400">
                The full article will be published soon.
              </p>
            )}

            {/* ---------- Share / back ---------- */}
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-6">
              <ButtonLink href="/news" variant="outline">
                <Icon name="chevron-left" className="h-4 w-4" />
                All news
              </ButtonLink>

              <ButtonLink href="/contact" variant="ghost">
                Contact the office
              </ButtonLink>
            </div>
          </div>
        </Section>
      </article>

      {/* ========================================
          MORE ARTICLES
          ======================================== */}
      {related.length > 0 ? (
        <Section muted>
          <h2 className="mb-6 font-display text-xl font-bold text-ink-900 sm:text-2xl">
            More from us
          </h2>

          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.id} className="card card-hover p-5">
                <StatusBadge status={item.type} />
                <h3 className="mt-3 text-base font-bold leading-snug text-ink-900">
                  <Link href={`/news/${item.slug}`} className="hover:text-brand-700">
                    {item.title}
                  </Link>
                </h3>
                {item.publishedAt ? (
                  <p className="mt-2 text-xs text-ink-500">{formatDate(item.publishedAt)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
