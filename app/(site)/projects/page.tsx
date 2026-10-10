// ========================================
// PROJECTS / OUR WORKS
// This code controls the Projects list page.
// ========================================
// Address: /projects
//
// This page shows only entries whose type is "Project".
// Entries of type "Our Work" appear on /our-works instead.
// Both are managed in the same place: Admin Panel → Projects & Our Works.
// ========================================

import type { Metadata } from 'next';
import { ProjectListing } from '@/components/public/ProjectListing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Long-term projects carried out by Janakalyan Samataa Yuwa Club with the local community.',
};

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <ProjectListing
      kind="PROJECT"
      basePath="/projects"
      eyebrow="Projects"
      title="Our projects"
      description="Longer-term projects run together with the community, from planning to results."
      emptyTitle="No projects published yet"
      searchParams={searchParams}
    />
  );
}
