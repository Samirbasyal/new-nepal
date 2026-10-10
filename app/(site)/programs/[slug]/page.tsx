// ========================================
// PROGRAMS SECTION
// This code controls a single Program page (the full details).
// ========================================
// Address: /programs/<address-of-the-program>
// Example: /programs/women-skills-training
//
// The address is built automatically from the program title when it is added
// in the Admin Panel (the "slug" column).
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Thumb } from '@/components/public/Thumb';
import { Container, Section } from '@/components/ui/Section';
import { getProgramBySlug } from '@/lib/data/public';
import { formatDate, parseLines } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// ========================================
// SEO - TITLE AND DESCRIPTION FOR THIS PROGRAM
// ========================================
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);

  if (!program) return { title: 'Program not found' };

  return {
    title: program.title,
    description: program.summary || program.description?.slice(0, 160) || undefined,
    openGraph: {
      title: program.title,
      description: program.summary ?? undefined,
      images: program.imageUrl ? [{ url: program.imageUrl }] : undefined,
    },
  };
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);

  // Unpublished or unknown programs behave as if they do not exist.
  if (!program) notFound();

  const objectives = parseLines(program.objectives);
  const results = parseLines(program.results);

  return (
    <>
      {/* ========================================
          HEADER
          ======================================== */}
      <header className="border-b border-ink-200 bg-ink-50">
        <Container className="py-8 sm:py-10">
          {/* Breadcrumb navigation - helps visitors find their way back */}
          <nav className="mb-4 text-sm text-ink-500" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-brand-700">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/programs" className="hover:text-brand-700">
                  Programs
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-ink-700">{program.title}</li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            {program.category ? (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                {program.category}
              </span>
            ) : null}
            <StatusBadge status={program.status} />
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-ink-900 sm:text-3xl lg:text-4xl">
            {program.title}
          </h1>

          {program.summary ? (
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-600">
              {program.summary}
            </p>
          ) : null}

          {/* ---------- Quick facts ---------- */}
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {program.location ? (
              <div className="flex items-center gap-2">
                <Icon name="map-pin" className="h-4 w-4 text-brand-600" />
                <dt className="sr-only-text">Location</dt>
                <dd className="text-ink-700">{program.location}</dd>
              </div>
            ) : null}

            {program.startDate ? (
              <div className="flex items-center gap-2">
                <Icon name="calendar" className="h-4 w-4 text-brand-600" />
                <dt className="sr-only-text">Start date</dt>
                <dd className="text-ink-700">{formatDate(program.startDate)}</dd>
              </div>
            ) : null}

            {program.endDate ? (
              <div className="flex items-center gap-2">
                <Icon name="clock" className="h-4 w-4 text-brand-600" />
                <dt className="sr-only-text">End date</dt>
                <dd className="text-ink-700">Ends {formatDate(program.endDate)}</dd>
              </div>
            ) : null}

            {program.targetGroup ? (
              <div className="flex items-center gap-2">
                <Icon name="users" className="h-4 w-4 text-brand-600" />
                <dt className="sr-only-text">Target group</dt>
                <dd className="text-ink-700">{program.targetGroup}</dd>
              </div>
            ) : null}
          </dl>
        </Container>
      </header>

      {/* ========================================
          MAIN CONTENT
          ======================================== */}
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-8">
            {/* ---------- Main picture ---------- */}
            <div className="mb-8 overflow-hidden rounded-card">
              <Thumb
                src={program.imageUrl}
                alt={program.title}
                ratio="aspect-[16/9]"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>

            {/* ---------- Full description ---------- */}
            {program.description ? (
              <div className="prose-content">
                {program.description.split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-ink-400">
                The full description of this program will be added soon.
              </p>
            )}

            {/* ---------- Objectives ---------- */}
            {objectives.length > 0 ? (
              <section className="mt-10 rounded-card border border-ink-200 bg-white p-6">
                <h2 className="text-lg font-bold text-ink-900">Objectives</h2>
                <ul className="mt-4 space-y-2.5">
                  {objectives.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                      <Icon name="target" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ---------- Results / impact ---------- */}
            {results.length > 0 ? (
              <section className="mt-6 rounded-card border border-ink-200 bg-white p-6">
                <h2 className="text-lg font-bold text-ink-900">Results so far</h2>
                <ul className="mt-4 space-y-2.5">
                  {results.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                      <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* ========================================
              SIDEBAR
              ======================================== */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">Support this work</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Your contribution helps us continue and expand this program.
                </p>

                <ButtonLink href="/donate" variant="accent" className="mt-4 w-full">
                  <Icon name="heart" className="h-4 w-4" />
                  Donate
                </ButtonLink>

                <ButtonLink href="/join" variant="outline" className="mt-2 w-full">
                  <Icon name="user-plus" className="h-4 w-4" />
                  Volunteer with us
                </ButtonLink>
              </div>

              {/* Related project (when the program belongs to one) */}
              {program.project ? (
                <div className="card p-6">
                  <h2 className="text-base font-bold text-ink-900">Part of</h2>
                  <Link
                    href={`${program.project.kind === 'WORK' ? '/our-works' : '/projects'}/${program.project.slug}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {program.project.title}
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}

              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">Explore more</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link href="/programs" className="text-brand-700 hover:underline">
                      All programs
                    </Link>
                  </li>
                  <li>
                    <Link href="/projects" className="text-brand-700 hover:underline">
                      Projects
                    </Link>
                  </li>
                  <li>
                    <Link href="/events" className="text-brand-700 hover:underline">
                      Events
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="text-brand-700 hover:underline">
                      Contact us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
