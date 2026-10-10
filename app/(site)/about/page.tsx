// ========================================
// ABOUT US PAGE
// This code controls the About page.
// ========================================
// PAGE SECTIONS
//   - Who We Are
//   - Vision
//   - Mission
//   - Objectives
//   - Core Values
//   - What We Do
//   - Our Approach
//
// All of the text above comes from Admin Panel -> Content sections, where the
// "group" must be set to "About page". The page reads them in order of the
// "Sort order" column, so the organization can rearrange them freely.
//
// NO INVENTED HISTORY: while a block is empty, the page shows a clear
// "[Add this text in Admin Panel → Content sections]" note instead of
// guessing at achievements, registrations or partnerships.
// ========================================

import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { ContentSectionGrid, ContentSectionView } from '@/components/public/ContentSectionView';
import { StatGrid } from '@/components/public/StatGrid';
import { getContentByGroup, getPublishedCounts } from '@/lib/data/public';
import { getSettings, setting } from '@/lib/settings';
import { formatNumber } from '@/lib/utils';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About us',
  description: `Who we are, our vision, mission and objectives. ${organization.name}.`,
};

export default async function AboutPage() {
  const [sections, settings, counts] = await Promise.all([
    getContentByGroup('ABOUT'),
    getSettings(),
    getPublishedCounts(),
  ]);

  const orgName = setting(settings, 'org.name', organization.name);
  const orgDescription = setting(settings, 'org.description');
  const foundedYear = setting(settings, 'org.foundedYear', '');
  const registrationInfo = setting(settings, 'org.registrationInfo', '');

  // Find well-known blocks by their slug so we can place them nicely.
  const find = (slug: string) => sections.find((section) => section.slug === slug);

  const whoWeAre = find('who-we-are');
  const vision = find('vision');
  const mission = find('mission');
  const objectives = find('objectives');
  const coreValues = find('core-values');
  const whatWeDo = find('what-we-do');
  const ourApproach = find('our-approach');

  // Anything an administrator added with another slug is still shown.
  const otherSections = sections.filter(
    (section) =>
      ![
        'who-we-are',
        'vision',
        'mission',
        'objectives',
        'core-values',
        'what-we-do',
        'our-approach',
      ].includes(section.slug),
  );

  const totalPublished = counts.programs + counts.projects + counts.events + counts.news;

  return (
    <>
      <PageHero
        eyebrow="About us"
        icon="users"
        title={`Who we are`}
        description={orgDescription}
      />

      {/* ========================================
          WHO WE ARE / INTRODUCTORY TEXT
          ======================================== */}
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            {whoWeAre ? (
              <ContentSectionView section={whoWeAre} showHeading />
            ) : (
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">Who we are</h2>
                <p className="mt-4 text-base leading-relaxed text-ink-600">{orgDescription}</p>
                <p className="mt-4 text-sm italic text-ink-400">
                  Add the full organization introduction in Admin Panel → Content sections
                  (slug: who-we-are).
                </p>
              </div>
            )}
          </div>

          {/* ---------- At a glance ---------- */}
          <div className="lg:col-span-5">
            <div className="card p-6">
              <h3 className="text-base font-bold text-ink-900">At a glance</h3>

              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-ink-700">Organization</dt>
                  <dd className="text-ink-600">{orgName}</dd>
                </div>

                {/* These two rows only appear when the organization has filled
                    them in, so we never publish unverified details. */}
                {foundedYear ? (
                  <div>
                    <dt className="font-semibold text-ink-700">Established</dt>
                    <dd className="text-ink-600">{foundedYear}</dd>
                  </div>
                ) : null}

                {registrationInfo ? (
                  <div>
                    <dt className="font-semibold text-ink-700">Registration</dt>
                    <dd className="text-ink-600">{registrationInfo}</dd>
                  </div>
                ) : null}

                {totalPublished > 0 ? (
                  <>
                    <div>
                      <dt className="font-semibold text-ink-700">Programs published</dt>
                      <dd className="text-ink-600">{formatNumber(counts.programs)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink-700">Projects published</dt>
                      <dd className="text-ink-600">{formatNumber(counts.projects)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>

              <p className="mt-5 border-t border-ink-100 pt-4 text-xs text-ink-500">
                These are live counts of what is published on this website - not impact claims.
                Add your impact figures in Admin Panel → Settings → Impact numbers.
              </p>

              <ButtonLink href="/contact" variant="outline" className="mt-5 w-full">
                <Icon name="mail" className="h-4 w-4" />
                Contact the office
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      {/* ========================================
          VISION AND MISSION
          ======================================== */}
      {vision || mission ? (
        <Section muted>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {vision ? (
              <div className="card p-7">
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-card bg-brand-50 text-brand-600">
                  <Icon name="eye" className="h-5 w-5" />
                </span>
                <h2 className="font-display text-xl font-bold text-ink-900">{vision.title}</h2>
                {vision.subtitle ? (
                  <p className="mt-1 text-sm font-medium text-brand-700">{vision.subtitle}</p>
                ) : null}
                <div className="mt-4 text-sm leading-relaxed text-ink-600">
                  {(vision.body ?? '').split(/\n\s*\n/).map((paragraph, index) => (
                    <p key={index} className={index > 0 ? 'mt-3' : ''}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {mission ? (
              <div className="card p-7">
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-card bg-accent-50 text-accent-600">
                  <Icon name="target" className="h-5 w-5" />
                </span>
                <h2 className="font-display text-xl font-bold text-ink-900">{mission.title}</h2>
                {mission.subtitle ? (
                  <p className="mt-1 text-sm font-medium text-accent-700">{mission.subtitle}</p>
                ) : null}
                <div className="mt-4 text-sm leading-relaxed text-ink-600">
                  {(mission.body ?? '').split(/\n\s*\n/).map((paragraph, index) => (
                    <p key={index} className={index > 0 ? 'mt-3' : ''}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ========================================
          OBJECTIVES
          ======================================== */}
      {objectives ? (
        <Section>
          <SectionHeading
            eyebrow="Objectives"
            icon="target"
            title={objectives.title}
            description={objectives.subtitle ?? undefined}
          />
          <ContentSectionView section={objectives} showHeading={false} />
        </Section>
      ) : null}

      {/* ========================================
          CORE VALUES / WHAT WE DO / OUR APPROACH
          ======================================== */}
      {coreValues || whatWeDo || ourApproach ? (
        <Section muted>
          <SectionHeading
            eyebrow="How we work"
            icon="shield-check"
            title="Core values, what we do and how we do it"
            align="center"
          />

          <ContentSectionGrid
            sections={[coreValues, whatWeDo, ourApproach].filter(
              (section): section is NonNullable<typeof section> => Boolean(section),
            )}
            columns={3}
          />
        </Section>
      ) : null}

      {/* ========================================
          IMPACT NUMBERS (hidden while empty)
          ======================================== */}
      <StatGrid title="Our impact" showHeading />

      {/* ========================================
          ANY OTHER ABOUT BLOCKS ADDED BY THE ADMINISTRATOR
          ======================================== */}
      {otherSections.length > 0 ? (
        <Section>
          <SectionHeading eyebrow="More" title="Further information" />
          <CardGrid columns={2}>
            {otherSections.map((section) => (
              <div key={section.id} className="card p-6">
                <ContentSectionView section={section} showHeading />
              </div>
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {/* ========================================
          EMPTY STATE
          Shown only when the About page has no content at all yet.
          ======================================== */}
      {sections.length === 0 ? (
        <Section>
          <EmptyState
            icon="file-text"
            title="About content will appear here"
            description="Add 'Who we are', 'Vision', 'Mission', 'Objectives', 'Core values', 'What we do' and 'Our approach' blocks from Admin Panel → Content sections. Choose the group 'About page' and set the sort order to control the sequence."
          />
        </Section>
      ) : null}
    </>
  );
}
