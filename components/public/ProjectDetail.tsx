// ========================================
// PROJECTS / OUR WORKS - SHARED DETAIL VIEW
// ========================================
// The full detail layout used by BOTH:
//   /projects/<slug>
//   /our-works/<slug>
//
// SHOWING
//   - title, category, status, location and dates
//   - main picture
//   - full description
//   - objectives, activities, results and impact (each shown only when filled)
//   - who benefited (free text only - no invented numbers)
//   - the programs that belong to this project
//   - a small photo gallery linked to this project
// ========================================

import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Thumb } from '@/components/public/Thumb';
import { GalleryGrid } from '@/components/public/GalleryGrid';
import { Container, Section } from '@/components/ui/Section';
import { formatDate, parseLines } from '@/lib/utils';

export type ProjectDetailData = {
  slug: string;
  title: string;
  kind?: string | null;
  category?: string | null;
  summary?: string | null;
  description?: string | null;
  objectives?: string | null;
  activities?: string | null;
  results?: string | null;
  impact?: string | null;
  beneficiaries?: string | null;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status?: string | null;
  imageUrl?: string | null;
  programs?: { id: string; slug: string; title: string; summary?: string | null; status?: string | null }[];
  galleryImages?: { id: string; imageUrl: string; title?: string | null }[];
};

export function ProjectDetail({ project }: { project: ProjectDetailData }) {
  const isWork = project.kind === 'WORK';
  const basePath = isWork ? '/our-works' : '/projects';
  const baseLabel = isWork ? 'Our Works' : 'Projects';

  // Each list is stored as "one item per line" in the Admin Panel.
  const objectives = parseLines(project.objectives);
  const activities = parseLines(project.activities);
  const results = parseLines(project.results);
  const impact = parseLines(project.impact);

  return (
    <>
      {/* ========================================
          HEADER
          ======================================== */}
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
                <Link href={basePath} className="hover:text-brand-700">
                  {baseLabel}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-ink-700">{project.title}</li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            {project.category ? (
              <span className="inline-flex items-center rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200">
                {project.category}
              </span>
            ) : null}
            <StatusBadge status={project.status} />
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-ink-900 sm:text-3xl lg:text-4xl">
            {project.title}
          </h1>

          {project.summary ? (
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-600">
              {project.summary}
            </p>
          ) : null}

          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {project.location ? (
              <div className="flex items-center gap-2">
                <Icon name="map-pin" className="h-4 w-4 text-brand-600" />
                <dt className="sr-only-text">Location</dt>
                <dd className="text-ink-700">{project.location}</dd>
              </div>
            ) : null}

            {project.startDate ? (
              <div className="flex items-center gap-2">
                <Icon name="calendar" className="h-4 w-4 text-brand-600" />
                <dt className="sr-only-text">Start date</dt>
                <dd className="text-ink-700">{formatDate(project.startDate)}</dd>
              </div>
            ) : null}

            {project.endDate ? (
              <div className="flex items-center gap-2">
                <Icon name="clock" className="h-4 w-4 text-brand-600" />
                <dt className="sr-only-text">End date</dt>
                <dd className="text-ink-700">Ends {formatDate(project.endDate)}</dd>
              </div>
            ) : null}
          </dl>
        </Container>
      </header>

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-8">
            <div className="mb-8 overflow-hidden rounded-card">
              <Thumb
                src={project.imageUrl}
                alt={project.title}
                ratio="aspect-[16/9]"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>

            {/* ---------- Full description ---------- */}
            {project.description ? (
              <div className="prose-content">
                {project.description.split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-ink-400">
                The full description of this entry will be added soon.
              </p>
            )}

            {/* ========================================
                OBJECTIVES
                ======================================== */}
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

            {/* ========================================
                ACTIVITIES
                ======================================== */}
            {activities.length > 0 ? (
              <section className="mt-6 rounded-card border border-ink-200 bg-white p-6">
                <h2 className="text-lg font-bold text-ink-900">Activities carried out</h2>
                <ul className="mt-4 space-y-2.5">
                  {activities.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ========================================
                RESULTS AND IMPACT
                ======================================== */}
            {results.length > 0 || impact.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {results.length > 0 ? (
                  <section className="rounded-card border border-ink-200 bg-white p-6">
                    <h2 className="text-lg font-bold text-ink-900">Results</h2>
                    <ul className="mt-4 space-y-2.5">
                      {results.map((item) => (
                        <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                          <Icon
                            name="check-circle"
                            className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {impact.length > 0 ? (
                  <section className="rounded-card border border-ink-200 bg-white p-6">
                    <h2 className="text-lg font-bold text-ink-900">Impact</h2>
                    <ul className="mt-4 space-y-2.5">
                      {impact.map((item) => (
                        <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                          <Icon
                            name="trending-up"
                            className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}

            {/* ========================================
                BENEFICIARIES
                This is the organization's own description of who benefited.
                We never calculate or invent a number here.
                ======================================== */}
            {project.beneficiaries ? (
              <section className="mt-6 rounded-card border border-ink-200 bg-brand-50/60 p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                  <Icon name="users" className="h-5 w-5 text-brand-600" />
                  Who benefited
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                  {project.beneficiaries}
                </p>
              </section>
            ) : null}

            {/* ========================================
                LINKED PROGRAMS
                ======================================== */}
            {project.programs && project.programs.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-lg font-bold text-ink-900">Programs in this project</h2>
                <ul className="mt-4 space-y-3">
                  {project.programs.map((program) => (
                    <li key={program.id} className="card p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={program.status} />
                      </div>
                      <Link
                        href={`/programs/${program.slug}`}
                        className="mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
                      >
                        {program.title}
                        <Icon name="arrow-right" className="h-4 w-4" />
                      </Link>
                      {program.summary ? (
                        <p className="mt-1 text-sm text-ink-600">{program.summary}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ========================================
                LINKED PHOTOS
                ======================================== */}
            {project.galleryImages && project.galleryImages.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-lg font-bold text-ink-900">Photos from this work</h2>
                <div className="mt-4">
                  <GalleryGrid photos={project.galleryImages} />
                </div>
              </section>
            ) : null}
          </div>

          {/* ========================================
              SIDEBAR
              ======================================== */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">Get involved</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Help us continue this work with the community.
                </p>

                <ButtonLink href="/donate" variant="accent" className="mt-4 w-full">
                  <Icon name="heart" className="h-4 w-4" />
                  Donate
                </ButtonLink>

                <ButtonLink href="/join" variant="outline" className="mt-2 w-full">
                  <Icon name="user-plus" className="h-4 w-4" />
                  Join as a volunteer
                </ButtonLink>
              </div>

              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">More</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link href="/projects" className="text-brand-700 hover:underline">
                      All projects
                    </Link>
                  </li>
                  <li>
                    <Link href="/our-works" className="text-brand-700 hover:underline">
                      All our works
                    </Link>
                  </li>
                  <li>
                    <Link href="/impact" className="text-brand-700 hover:underline">
                      Our impact
                    </Link>
                  </li>
                  <li>
                    <Link href="/gallery" className="text-brand-700 hover:underline">
                      Gallery
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
