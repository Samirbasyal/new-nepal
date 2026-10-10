// ========================================
// IMPACT PAGE
// This code controls the Impact page.
// ========================================
// NO INVENTED STATISTICS
//   The number blocks at the top come from Admin Panel -> Settings ->
//   "Impact numbers". While those are empty the blocks do not appear at all.
//
//   Below them the page shows live counts of what is actually published on
//   this website counts (programs, projects, events, news, photos). Those are
//   verifiable facts about this website, not impact claims.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { ContentSectionGrid } from '@/components/public/ContentSectionView';
import { StatGrid } from '@/components/public/StatGrid';
import { getContentByGroup, getPublishedCounts, getPublicDonors } from '@/lib/data/public';
import { formatNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Our impact',
  description:
    'What Janakalyan Samataa Yuwa Club has achieved together with the community, and the content published on this website.',
};

export default async function ImpactPage() {
  const [counts, impactContent, donors] = await Promise.all([
    getPublishedCounts(),
    getContentByGroup('IMPACT'),
    getPublicDonors(),
  ]);

  const totalEntries = counts.programs + counts.projects + counts.works + counts.events + counts.news;
  const activeDonors = donors.length;

  return (
    <>
      <PageHero
        eyebrow="Impact"
        icon="chart"
        title="Our impact"
        description="What our work has achieved so far, told honestly."
      />

      {/* ========================================
          REAL IMPACT NUMBERS (from the Admin Panel)
          This block disappears completely while the numbers are empty.
          ======================================== */}
      <StatGrid
        title="Numbers we can stand behind"
        description="Figures entered and verified by the organization."
        showHeading={false}
      />

      {/* ========================================
          WHAT IS PUBLISHED ON THIS WEBSITE RIGHT NOW
          ======================================== */}
      <Section>
        <SectionHeading
          eyebrow="On this website"
          icon="grid"
          title="What we have published"
          description="A live count of the content on this website. It updates automatically as the team adds more."
        />

        {totalEntries > 0 ? (
          <CardGrid columns={3}>
            {[
              { label: 'Programs', value: counts.programs, href: '/programs', icon: 'layers' as const },
              { label: 'Projects', value: counts.projects, href: '/projects', icon: 'briefcase' as const },
              { label: 'Our works', value: counts.works, href: '/our-works', icon: 'check-circle' as const },
              { label: 'Events', value: counts.events, href: '/events', icon: 'calendar' as const },
              { label: 'News and notices', value: counts.news, href: '/news', icon: 'megaphone' as const },
              { label: 'Photos in the gallery', value: counts.photos, href: '/gallery', icon: 'image' as const },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="card card-hover flex items-center gap-4 p-5"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-brand-50 text-brand-600">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-2xl font-bold text-ink-900">
                    {formatNumber(item.value)}
                  </span>
                  <span className="block text-sm text-ink-600">{item.label}</span>
                </span>
              </Link>
            ))}
          </CardGrid>
        ) : (
          <EmptyState
            icon="chart"
            title="Content statistics will appear here"
            description="As soon as programs, projects, events and news are published in the Admin Panel, their counts appear here automatically."
          />
        )}

        {activeDonors > 0 ? (
          <p className="mt-6 text-sm text-ink-500">
            {formatNumber(activeDonors)} supporters have agreed to be listed publicly.{' '}
            <Link href="/donors" className="font-semibold text-brand-700 hover:underline">
              See our supporters
            </Link>
          </p>
        ) : null}
      </Section>

      {/* ========================================
          IMPACT TEXT BLOCKS (Admin Panel -> Content sections, group "Impact")
          ======================================== */}
      {impactContent.length > 0 ? (
        <Section muted>
          <SectionHeading
            eyebrow="In our words"
            icon="quote"
            title="How our work makes a difference"
          />
          <ContentSectionGrid sections={impactContent} columns={2} />
        </Section>
      ) : null}

      {/* ========================================
          CALL TO ACTION
          ======================================== */}
      <Section>
        <div className="rounded-card bg-brand-800 px-6 py-12 text-center text-white sm:px-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Help us do more
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-brand-100">
            Every contribution - time, skills or support - helps us reach more families.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/donate" variant="accent" size="lg">
              <Icon name="heart" className="h-5 w-5" />
              Donate
            </ButtonLink>
            <ButtonLink href="/join" variant="outline-light" size="lg">
              <Icon name="user-plus" className="h-5 w-5" />
              Join as a volunteer
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
