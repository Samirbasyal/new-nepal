// ========================================
// PROJECTS / OUR WORKS
// This code controls a single "Our Work" page (the full details).
// ========================================
// Address: /our-works/<address-of-the-work>
//
// It uses the same detail layout as /projects/<slug>, because "Projects" and
// "Our Works" are stored in one database table and differ only by their
// "kind" value.
// ========================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectDetail } from '@/components/public/ProjectDetail';
import { getProjectBySlug } from '@/lib/data/public';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = await getProjectBySlug(slug);

  if (!work) return { title: 'Not found' };

  return {
    title: work.title,
    description: work.summary || work.description?.slice(0, 160) || undefined,
    openGraph: {
      title: work.title,
      description: work.summary ?? undefined,
      images: work.imageUrl ? [{ url: work.imageUrl }] : undefined,
    },
  };
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = await getProjectBySlug(slug);

  if (!work) notFound();

  return <ProjectDetail project={work} />;
}
