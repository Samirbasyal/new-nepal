// ========================================
// EVENTS SECTION
// This code controls a single Event page.
// ========================================
// Address: /events/<address-of-the-event>
//
// SHOWING
//   - the date badge and full date/time
//   - location
//   - description
//   - registration information (free text typed by the administrator, for
//     example a phone number or a link to a sign-up form)
//   - photos linked to this event
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Thumb } from '@/components/public/Thumb';
import { GalleryGrid } from '@/components/public/GalleryGrid';
import { Container, Section } from '@/components/ui/Section';
import { getEventBySlug } from '@/lib/data/public';
import { formatDate, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) return { title: 'Event not found' };

  return {
    title: event.title,
    description: event.summary || event.description?.slice(0, 160) || undefined,
    openGraph: {
      title: event.title,
      description: event.summary ?? undefined,
      images: event.imageUrl ? [{ url: event.imageUrl }] : undefined,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  const start = new Date(event.startsAt);
  const day = Number.isNaN(start.getTime()) ? '' : start.getDate();
  const month = Number.isNaN(start.getTime()) ? '' : start.toLocaleDateString('en-GB', { month: 'short' });
  const year = Number.isNaN(start.getTime()) ? '' : start.getFullYear();
  const isUpcoming = start.getTime() > Date.now();

  return (
    <>
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
                <Link href="/events" className="hover:text-brand-700">
                  Events
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-ink-700">{event.title}</li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-start gap-6">
            {/* ---------- Big date badge ---------- */}
            {day ? (
              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-card bg-white shadow-card">
                <span className="text-2xl font-bold leading-none text-brand-700">{day}</span>
                <span className="text-xs font-semibold uppercase text-ink-600">{month}</span>
                <span className="text-[10px] text-ink-500">{year}</span>
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <StatusBadge
                status={
                  event.status === 'UPCOMING' && !isUpcoming ? 'COMPLETED' : event.status
                }
              />

              <h1 className="mt-2 font-display text-2xl font-bold leading-tight text-ink-900 sm:text-3xl lg:text-4xl">
                {event.title}
              </h1>

              {event.summary ? (
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-600">
                  {event.summary}
                </p>
              ) : null}

              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Icon name="calendar" className="h-4 w-4 text-brand-600" />
                  <dt className="sr-only-text">Date and time</dt>
                  <dd className="text-ink-700">{formatDateTime(event.startsAt)}</dd>
                </div>

                {event.endsAt ? (
                  <div className="flex items-center gap-2">
                    <Icon name="clock" className="h-4 w-4 text-brand-600" />
                    <dt className="sr-only-text">Ends</dt>
                    <dd className="text-ink-700">Ends {formatDateTime(event.endsAt)}</dd>
                  </div>
                ) : null}

                {event.location ? (
                  <div className="flex items-center gap-2">
                    <Icon name="map-pin" className="h-4 w-4 text-brand-600" />
                    <dt className="sr-only-text">Location</dt>
                    <dd className="text-ink-700">{event.location}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </Container>
      </header>

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-8">
            <div className="mb-8 overflow-hidden rounded-card">
              <Thumb
                src={event.imageUrl}
                alt={event.title}
                ratio="aspect-[16/9]"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>

            {event.description ? (
              <div className="prose-content">
                {event.description.split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-ink-400">
                More details about this event will be added soon.
              </p>
            )}

            {/* ========================================
                PHOTOS FROM THIS EVENT
                ======================================== */}
            {event.galleryImages && event.galleryImages.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-lg font-bold text-ink-900">Photos from this event</h2>
                <div className="mt-4">
                  <GalleryGrid photos={event.galleryImages} />
                </div>
              </section>
            ) : null}
          </div>

          {/* ========================================
              SIDEBAR
              ======================================== */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              {/* ---------- Registration information ---------- */}
              {event.registrationInfo ? (
                <div className="card p-6">
                  <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
                    <Icon name="user-plus" className="h-5 w-5 text-brand-600" />
                    How to take part
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                    {event.registrationInfo}
                  </p>

                  {isUpcoming ? (
                    <ButtonLink href="/contact" variant="primary" className="mt-4 w-full">
                      Ask about this event
                    </ButtonLink>
                  ) : null}
                </div>
              ) : (
                <div className="card p-6">
                  <h2 className="text-base font-bold text-ink-900">Interested?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    Contact our office for more information about this event.
                  </p>
                  <ButtonLink href="/contact" variant="primary" className="mt-4 w-full">
                    Contact us
                  </ButtonLink>
                </div>
              )}

              {/* ---------- Event summary box ---------- */}
              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">Event details</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="font-semibold text-ink-700">Date</dt>
                    <dd className="text-ink-600">{formatDate(event.startsAt)}</dd>
                  </div>
                  {event.endsAt ? (
                    <div>
                      <dt className="font-semibold text-ink-700">Ends</dt>
                      <dd className="text-ink-600">{formatDate(event.endsAt)}</dd>
                    </div>
                  ) : null}
                  {event.location ? (
                    <div>
                      <dt className="font-semibold text-ink-700">Location</dt>
                      <dd className="text-ink-600">{event.location}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-semibold text-ink-700">Status</dt>
                    <dd>
                      <StatusBadge
                        status={event.status === 'UPCOMING' && !isUpcoming ? 'COMPLETED' : event.status}
                      />
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="card p-6">
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/events?when=upcoming" className="text-brand-700 hover:underline">
                      Upcoming events
                    </Link>
                  </li>
                  <li>
                    <Link href="/events?when=past" className="text-brand-700 hover:underline">
                      Past events
                    </Link>
                  </li>
                  <li>
                    <Link href="/gallery" className="text-brand-700 hover:underline">
                      Photo gallery
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
