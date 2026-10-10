// ========================================
// EVENTS SECTION
// This code controls the Events list page.
// ========================================
// Address: /events
//
//   ?when=upcoming  -> only events in the future (sorted soonest first)
//   ?when=past      -> only events that have already happened
//   (nothing)       -> everything, newest first
//
// Only PUBLISHED events are shown. Events are added in the Admin Panel.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard } from '@/components/public/Cards';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { PageHero, Section, CardGrid } from '@/components/ui/Section';
import { getEvents } from '@/lib/data/public';
import { PAGE_SIZE } from '@/lib/constants';
import { buildPageHref, cn, parsePage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Upcoming and past events of Janakalyan Samataa Yuwa Club - gatherings, trainings, campaigns and community programs.',
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; when?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const when = params.when === 'upcoming' || params.when === 'past' ? params.when : undefined;

  // The database does the filtering and the sorting, so paging stays correct.
  const result = await getEvents({
    page,
    pageSize: PAGE_SIZE,
    upcomingOnly: when === 'upcoming',
    pastOnly: when === 'past',
  });

  const rows = result.rows;
  const total = result.total;

  const tabs = [
    { key: undefined, label: 'All events', href: '/events' },
    { key: 'upcoming', label: 'Upcoming', href: '/events?when=upcoming' },
    { key: 'past', label: 'Past events', href: '/events?when=past' },
  ];

  return (
    <>
      <PageHero
        eyebrow="Events"
        icon="calendar"
        title="Events"
        description="Gatherings, trainings, campaigns and community programs. Everyone is welcome."
      />

      <Section>
        {/* ========================================
            TIME FILTER TABS
            ======================================== */}
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Filter events by time">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                when === tab.key
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* ========================================
            EVENT CARDS
            ======================================== */}
        {rows.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-ink-500">
              Showing {rows.length} of {total} {total === 1 ? 'event' : 'events'}.
            </p>

            <CardGrid>
              {rows.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </CardGrid>

            <Pagination
              basePath="/events"
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              params={{ when }}
            />
          </>
        ) : (
          <EmptyState
            icon="calendar"
            title={
              when === 'upcoming'
                ? 'No upcoming events right now'
                : when === 'past'
                  ? 'No past events recorded yet'
                  : 'No events published yet'
            }
            description="Events are added from Admin Panel → Events. Switch on 'Published' and they appear here, with a date badge and registration information."
          />
        )}

        {when === 'past' ? null : (
          <p className="mt-8 text-center text-sm text-ink-500">
            Looking for something that already happened?{' '}
            <Link href="/events?when=past" className="font-semibold text-brand-700 hover:underline">
              See past events
            </Link>
          </p>
        )}
      </Section>
    </>
  );
}
