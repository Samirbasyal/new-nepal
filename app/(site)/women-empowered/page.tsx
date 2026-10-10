// ========================================
// WOMEN EMPOWERED
// This code controls the Women Empowered page.
// ========================================
// CONTENT SOURCE
//   All text on this page comes from Admin Panel -> Content sections with the
//   group "Women Empowered". The organization can therefore rewrite the
//   introduction, activities, programs and stories at any time without
//   touching code.
//
// NO INVENTED SUCCESS STORIES
//   The "Stories" area only appears when the organization has actually added
//   story blocks. While it is empty nothing is shown - we would rather show
//   an honest invitation to add content than a made-up story.
//
// PHOTOS come from Admin Panel -> Gallery.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { ContentSectionGrid, ContentSectionView } from '@/components/public/ContentSectionView';
import { ProgramCard } from '@/components/public/ProgramCard';
import { StatGrid } from '@/components/public/StatGrid';
import { getContentByGroup, getGalleryImages, getPrograms } from '@/lib/data/public';
import { getSettings, hasRealValue, setting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Women empowered',
  description:
    'Our work with women and girls - skills, confidence, health awareness and livelihood support.',
};

export default async function WomenEmpoweredPage() {
  const [content, programs, photos, settings] = await Promise.all([
    getContentByGroup('WOMEN'),
    getPrograms({ pageSize: 6, category: undefined }),
    getGalleryImages({ limit: 8 }),
    getSettings(),
  ]);

  // Split the blocks into "intro" text and "story" blocks by slug.
  const intro = content.find((section) => section.slug === 'women-empowered') ?? content[0];
  const storyBlocks = content.filter((section) =>
    ['story', 'success-story', 'stories'].includes(section.slug),
  );
  const otherBlocks = content.filter(
    (section) => section.id !== intro?.id && !storyBlocks.some((story) => story.id === section.id),
  );

  // Which programs are about women? We simply look for the word in the title
  // or category, so the organization does not have to tick a special box.
  const womenPrograms = programs.rows.filter((program) =>
    `${program.title} ${program.category ?? ''}`.toLowerCase().includes('women'),
  );

  const womenStory = setting(settings, 'women.story', '');

  return (
    <>
      <PageHero
        eyebrow="Women empowered"
        icon="sparkles"
        title={intro?.title || 'Women empowered'}
        description={
          intro?.subtitle ||
          'Supporting women and girls with skills, confidence, health awareness and a voice in their community.'
        }
      />

      {/* ========================================
          INTRODUCTION
          ======================================== */}
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            {intro ? (
              <ContentSectionView section={intro} showHeading={false} />
            ) : (
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  Why this work matters
                </h2>
                <p className="mt-4 text-base leading-relaxed text-ink-600">
                  Women are at the centre of every strong community. When women have skills, income
                  and confidence, whole families and neighbourhoods benefit.
                </p>
                <p className="mt-4 text-sm italic text-ink-400">
                  Replace this text in Admin Panel → Content sections (group: Women Empowered,
                  slug: women-empowered).
                </p>
              </div>
            )}
          </div>

          {/* ---------- What this work includes ---------- */}
          <div className="lg:col-span-5">
            <div className="card p-6">
              <h2 className="text-base font-bold text-ink-900">What this work includes</h2>
              <ul className="mt-4 space-y-3">
                {[
                  'Skills training and learning groups',
                  'Support for small income activities',
                  'Health and wellbeing awareness',
                  'Confidence, leadership and decision making',
                  'A safe space to speak and be heard',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-ink-700">
                    <Icon name="check-circle" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 border-t border-ink-100 pt-4 text-xs text-ink-500">
                Edit this list in app/(site)/women-empowered/page.tsx, or turn it into a
                Content section from the Admin Panel.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ========================================
          OTHER CONTENT BLOCKS (activities, approach, ...)
          ======================================== */}
      {otherBlocks.length > 0 ? (
        <Section muted>
          <SectionHeading
            eyebrow="Activities"
            icon="activity"
            title="What we do"
            description="Activities and approaches used in our work with women."
          />
          <ContentSectionGrid sections={otherBlocks} columns={2} />
        </Section>
      ) : null}

      {/* ========================================
          RELATED PROGRAMS
          ======================================== */}
      {womenPrograms.length > 0 ? (
        <Section>
          <SectionHeading
            eyebrow="Programs"
            icon="layers"
            title="Programs for women"
            description="Programs whose title or category mentions women."
          />

          <CardGrid>
            {womenPrograms.slice(0, 3).map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </CardGrid>

          <div className="mt-8 text-center">
            <ButtonLink href="/programs" variant="outline">
              All programs
            </ButtonLink>
          </div>
        </Section>
      ) : null}

      {/* ========================================
          IMPACT NUMBERS (hidden while empty)
          ======================================== */}
      <StatGrid title="Women empowered - our numbers" showHeading />

      {/* ========================================
          STORIES
          Only shown when the organization has added real stories.
          ======================================== */}
      {storyBlocks.length > 0 || hasRealValue(womenStory) ? (
        <Section muted>
          <SectionHeading
            eyebrow="Stories"
            icon="quote"
            title="Stories from the community"
            description="Real experiences shared with permission."
          />

          <ContentSectionGrid sections={storyBlocks} columns={2} />

          {hasRealValue(womenStory) ? (
            <blockquote className="mt-6 rounded-card border-l-4 border-accent-500 bg-white p-6">
              <Icon name="quote" className="h-6 w-6 text-accent-500" />
              <p className="mt-3 text-base italic leading-relaxed text-ink-700">{womenStory}</p>
            </blockquote>
          ) : null}
        </Section>
      ) : (
        <Section muted>
          <EmptyState
            icon="quote"
            title="Stories will be published here"
            description="When a member of the community shares their experience - with their permission - it can be added from Admin Panel → Content sections (group: Women Empowered, slug: story)."
          />
        </Section>
      )}

      {/* ========================================
          PHOTOS
          ======================================== */}
      {photos.length > 0 ? (
        <Section>
          <SectionHeading eyebrow="Photos" icon="image" title="Photos from this work" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.slice(0, 8).map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-card bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt={photo.title || 'Photo from our work with women'}
                  className="h-40 w-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <ButtonLink href="/gallery" variant="outline">
              Open the full gallery
            </ButtonLink>
          </div>
        </Section>
      ) : null}

      {/* ========================================
          CALL TO ACTION
          ======================================== */}
      <Section>
        <div className="rounded-card bg-brand-800 px-6 py-12 text-center text-white sm:px-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Support women in our community
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-brand-100">
            Your support helps us run training, awareness and livelihood activities.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/donate" variant="accent" size="lg">
              Donate
            </ButtonLink>
            <ButtonLink href="/join" variant="outline-light" size="lg">
              Volunteer with us
            </ButtonLink>
          </div>

          <p className="mt-6 text-xs text-brand-200">
            See also our{' '}
            <Link href="/beneficiaries" className="underline">
              beneficiaries
            </Link>{' '}
            and{' '}
            <Link href="/impact" className="underline">
              impact
            </Link>{' '}
            pages.
          </p>
        </div>
      </Section>
    </>
  );
}
