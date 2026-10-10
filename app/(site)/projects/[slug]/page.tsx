// ========================================
// PROJECTS / OUR WORKS
// This code controls a single Project page (the full details).
// ========================================
// Address: /projects/<address-of-the-project>
//
// The visual layout lives in components/public/ProjectDetail.tsx, which is
// shared with /our-works/<project>.
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
  const project = await getProjectBySlug(slug);

  if (!project) return { title: 'Project not found' };

  return {
    title: project.title,
    description: project.summary || project.description?.slice(0, 160) || undefined,
    openGraph: {
      title: project.title,
      description: project.summary ?? undefined,
      images: project.imageUrl ? [{ url: project.imageUrl }] : undefined,
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  // Only published projects are reachable. Anything else shows the 404 page.
  if (!project) notFound();

  return <ProjectDetail project={project} />;
}
