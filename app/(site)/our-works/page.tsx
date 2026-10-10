// ========================================
// PROJECTS / OUR WORKS
// This code controls the "Our Works" list page.
// ========================================
// Address: /our-works
//
// This page shows only entries whose type is "Our Work".
// Entries of type "Project" appear on /projects instead.
// Both are managed in the same place: Admin Panel → Projects & Our Works.
// ========================================

import type { Metadata } from 'next';
import { ProjectListing } from '@/components/public/ProjectListing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Our works',
  description:
    'The day-to-day work of Janakalyan Samataa Yuwa Club in the community - activities, campaigns and initiatives.',
};

export default function OurWorksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <ProjectListing
      kind="WORK"
      basePath="/our-works"
      eyebrow="Our works"
      title="Our works"
      description="The activities, campaigns and initiatives behind our programs."
      emptyTitle="No works published yet"
      searchParams={searchParams}
    />
  );
}
