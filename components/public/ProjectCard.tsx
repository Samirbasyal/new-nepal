// ========================================
// PROJECTS / OUR WORKS
// This code controls the cards shown on /projects and /our-works,
// and in the homepage previews.
// ========================================

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Thumb } from '@/components/public/Thumb';
import { formatDate, truncate } from '@/lib/utils';

export type ProjectCardData = {
  slug: string;
  title: string;
  kind?: string | null;
  category?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  startDate?: Date | null;
  status?: string | null;
  imageUrl?: string | null;
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const description = project.summary || truncate(project.description ?? '', 140);
  // "WORK" entries are listed under /our-works, "PROJECT" entries under /projects.
  const basePath = project.kind === 'WORK' ? '/our-works' : '/projects';

  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link href={`${basePath}/${project.slug}`} className="block" tabIndex={-1} aria-hidden="true">
        <Thumb src={project.imageUrl} alt={project.title} />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {project.category ? (
            <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200">
              {project.category}
            </span>
          ) : null}
          <StatusBadge status={project.status} />
        </div>

        <h3 className="text-lg font-bold leading-snug text-ink-900">
          <Link href={`${basePath}/${project.slug}`} className="hover:text-brand-700">
            {project.title}
          </Link>
        </h3>

        {description ? (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{description}</p>
        ) : (
          <p className="mt-2 flex-1 text-sm italic text-ink-400">Details will be added soon.</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
          {project.location ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="map-pin" className="h-3.5 w-3.5" />
              {project.location}
            </span>
          ) : null}

          {project.startDate ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" className="h-3.5 w-3.5" />
              {formatDate(project.startDate)}
            </span>
          ) : null}
        </div>

        <Link
          href={`${basePath}/${project.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:gap-2.5 transition-all"
        >
          View details
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
