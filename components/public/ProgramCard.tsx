// ========================================
// PROGRAMS SECTION
// This code controls the program cards shown on /programs
// and in the "Our programs" block of the homepage.
// ========================================

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Thumb } from '@/components/public/Thumb';
import { formatDate, truncate } from '@/lib/utils';

export type ProgramCardData = {
  slug: string;
  title: string;
  category?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  startDate?: Date | null;
  status?: string | null;
  imageUrl?: string | null;
};

export function ProgramCard({ program }: { program: ProgramCardData }) {
  const description = program.summary || truncate(program.description ?? '', 140);

  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      {/* Program picture */}
      <Link href={`/programs/${program.slug}`} className="block" tabIndex={-1} aria-hidden="true">
        <Thumb src={program.imageUrl} alt={program.title} />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {/* Category + status badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {program.category ? (
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
              {program.category}
            </span>
          ) : null}
          <StatusBadge status={program.status} />
        </div>

        {/* Program title */}
        <h3 className="text-lg font-bold leading-snug text-ink-900">
          <Link href={`/programs/${program.slug}`} className="hover:text-brand-700">
            {program.title}
          </Link>
        </h3>

        {description ? (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{description}</p>
        ) : (
          <p className="mt-2 flex-1 text-sm italic text-ink-400">Details will be added soon.</p>
        )}

        {/* Small facts row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
          {program.location ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="map-pin" className="h-3.5 w-3.5" />
              {program.location}
            </span>
          ) : null}

          {program.startDate ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" className="h-3.5 w-3.5" />
              {formatDate(program.startDate)}
            </span>
          ) : null}
        </div>

        <Link
          href={`/programs/${program.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:gap-2.5 transition-all"
        >
          Read more
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
