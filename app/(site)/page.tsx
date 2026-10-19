// ========================================
// HOME PAGE
// This code controls the Homepage.
// ========================================
// The homepage is built from the same database content as the rest of the
// website, so anything an administrator adds in the Admin Panel appears here
// automatically. Nothing on this page is invented: when a section is still
// empty, a friendly message is shown instead of example data.
//
// THE SECTIONS OF THIS PAGE, IN ORDER
//   1. HERO                 -> components/public/Hero.tsx
//   2. INTRODUCTION         -> Settings -> "Homepage content"
//   3. PROGRAMS PREVIEW     -> Program cards
//   4. PROJECTS PREVIEW     -> Project cards
//   5. IMPACT               -> Settings -> "Impact numbers"
//   6. BENEFICIARIES        -> Beneficiary cards
//   7. WOMEN EMPOWERED      -> Content sections (group = WOMEN)
//   8. UPCOMING EVENTS      -> Event cards
//   9. LATEST NEWS          -> News cards
//  10. GALLERY PREVIEW      -> Gallery grid
//  11. DONORS               -> Donor cards
//  12. CALLS TO ACTION      -> Join / Donate / Contact
// ========================================

import Image from 'next/image';
import Link from 'next/link';
import { Hero } from '@/components/public/Hero';
import { HeroSlider, type SliderPhoto } from '@/components/public/HeroSlider';
import { FocusAreas } from '@/components/public/FocusAreas';
import { DonateBand } from '@/components/public/DonateBand';
import { MembersStrip, type PublicMemberCard } from '@/components/public/MembersStrip';
import { StatGrid } from '@/components/public/StatGrid';
import { ProgramCard } from '@/components/public/ProgramCard';
import { ProjectCard } from '@/components/public/ProjectCard';
import { AlbumCard, BeneficiaryCard, EventCard, NewsCard } from '@/components/public/Cards';
import { GalleryGrid } from '@/components/public/GalleryGrid';
import { DonorGallery, type PublicDonor } from '@/components/public/DonorGallery';
import { DonorAccountBand } from '@/components/public/DonorAccountBand';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { CardGrid, Container, Section, SectionHeading } from '@/components/ui/Section';
import {
  getBeneficiaryCategories,
  getContentByGroup,
  getEvents,
  getGalleryAlbums,
  getGalleryImages,
  getHomepageData,
  getNewsPosts,
  getPrograms,
  getProjects,
  getPublicDonors,
  getPublicMembers,
  getSliderImages,
} from '@/lib/data/public';
import { getSettings, hasRealValue, setting } from '@/lib/settings';
import { formatNumber } from '@/lib/utils';

// Always show fresh content - the homepage changes whenever the Admin Panel does.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Load everything the homepage needs, in parallel.
  const [data, settings, womenContent, donors, focusRows, publicMembers, sliderImages] =
    await Promise.all([
    getHomepageData(),
    getSettings(),
    getContentByGroup('WOMEN'),
    getPublicDonors(),
    // The four "What We Work For" cards, written in Admin Panel -> Content
    // sections. An empty group is fine - the component falls back to the agreed
    // wording rather than leaving the band blank.
    getContentByGroup('FOCUS'),
    getPublicMembers(),
    getSliderImages(6),
  ]);

  const introTitle = setting(settings, 'home.aboutTitle');
  const introBody = setting(settings, 'home.aboutBody');
  const aboutImageUrl = setting(settings, 'home.aboutImageUrl', '');
  const womenIntro = womenContent[0];
  const topDonors = donors.slice(0, 6);

  // ========================================
  // THE HERO SLIDER
  // ========================================
  // Real gallery photographs, already managed in Admin Panel -> Gallery. Only the
  // four fields the slider needs are passed on.
  // These come from the photos an administrator marked "Hero slider" - NOT from
  // the photo wall. Two separate sets, on purpose.
  const sliderPhotos: SliderPhoto[] = sliderImages.map((photo) => ({
    id: photo.id,
    imageUrl: photo.imageUrl,
    title: photo.title ?? null,
    category: photo.category ?? null,
  }));

  // ========================================
  // THE MEMBER FACES
  // ========================================
  // getPublicMembers() already selects only public, safe columns.
  const memberCards: PublicMemberCard[] = publicMembers.slice(0, 6).map((member) => ({
    id: member.id,
    name: member.user.name,
    designation: member.designation ?? null,
    photoUrl: member.photoUrl ?? null,
  }));

  // ========================================
  // THE SIX FACES ON THE HOME PAGE
  // ========================================
  // Hand-mapped, so the browser receives exactly what a card and its detail
  // panel need - and nothing that belongs only to the admin panel.
  const galleryDonors: PublicDonor[] = topDonors.map((donor) => ({
    id: donor.id,
    name: donor.name,
    photoUrl: donor.logoUrl ? `/api/donors/photo/${donor.id}` : null,
    address: donor.address ?? null,
    occupation: donor.occupation ?? null,
    purpose: donor.donationPurpose ?? donor.supportArea ?? null,
    description: donor.description ?? null,
  }));

  // Real counts of what is published on this website (not impact claims).
  const published = {
    programs: data.programs.total,
    projects: data.projects.total,
    events: data.events.total,
    news: data.news.total,
  };
  const hasPublishedContent =
    published.programs + published.projects + published.events + published.news > 0;

  return (
    <>
      {/* ========================================
          1. HERO SECTION
          ======================================== */}
      <Hero photos={sliderPhotos} />

      {/* ========================================
          2. WHAT WE WORK FOR
          ======================================== */}
      <FocusAreas rows={focusRows} />

      {/* ========================================
          3. INTRODUCTION / ABOUT PREVIEW
          ======================================== */}
      <Section>
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
          {/* The photograph comes first on a wide screen, and after the text on a
              phone - order utilities keep the reading order sensible without
              duplicating any markup. */}
          <div className="lg:order-2 lg:col-span-7">
            <p className="eyebrow mb-2">
              <Icon name="users" className="h-4 w-4" />
              Community-based youth organization
            </p>

            <h2 className="font-display text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
              {introTitle}
            </h2>

            <p className="mt-4 text-base leading-relaxed text-ink-600">{introBody}</p>

            {/* Real website content counters. They appear only when there is
                something published, so nobody sees a row of zeros. */}
            {hasPublishedContent ? (
              <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Programs', value: published.programs, href: '/programs' },
                  { label: 'Projects', value: published.projects, href: '/projects' },
                  { label: 'Events', value: published.events, href: '/events' },
                  { label: 'News', value: published.news, href: '/news' },
                ].map((item) => (
                  <div key={item.label} className="rounded-card bg-ink-50 p-4">
                    <dt className="order-2 text-xs text-ink-500">{item.label}</dt>
                    <dd className="text-2xl font-bold text-brand-700">
                      {formatNumber(item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/about" variant="primary">
                Read more about us
              </ButtonLink>
              <ButtonLink href="/our-works" variant="outline">
                See our work
              </ButtonLink>
            </div>
          </div>

          {/* The picture, when one has been chosen in Settings -> Homepage. Until
              then the highlights list keeps the column useful - never an empty
              box and never a borrowed stock photo. */}
          <div className="lg:order-1 lg:col-span-5">
            {aboutImageUrl ? (
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-card ring-1 ring-ink-200">
                <Image
                  src={aboutImageUrl}
                  alt="Members of Janakalyan Samataa Yuwa Club at work in the community"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            ) : (
            <div className="card p-6">
              <h3 className="text-base font-bold text-ink-900">Our main areas of work</h3>

              <ul className="mt-4 space-y-3">
                {[
                  { icon: 'book' as const, title: 'Education', text: 'Learning support for children and young people.' },
                  { icon: 'stethoscope' as const, title: 'Health', text: 'Awareness and community health activities.' },
                  { icon: 'heart-handshake' as const, title: 'Women empowerment', text: 'Skills, confidence and livelihood support.' },
                  { icon: 'leaf' as const, title: 'Environment', text: 'Cleaner, greener and safer neighbourhoods.' },
                  { icon: 'users' as const, title: 'Youth leadership', text: 'Giving young people a voice and a role.' },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-600">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink-900">{item.title}</span>
                      <span className="block text-xs text-ink-500">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 border-t border-ink-100 pt-4 text-xs text-ink-500">
                Edit this list in config/site.ts or replace it with your own programs.
              </p>
            </div>
            )}
          </div>
        </div>
      </Section>

      {/* ========================================
          3. PROGRAMS PREVIEW
          ======================================== */}
      <Section muted>
        <SectionHeading
          eyebrow="Programs and activities"
          icon="layers"
          title="Recent Programs"
          description="Ongoing and past programs run together with the community."
        />

        {data.programs.rows.length > 0 ? (
          <>
            <CardGrid>
              {data.programs.rows.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </CardGrid>

            <div className="mt-8 text-center">
              <ButtonLink href="/programs" variant="outline">
                View all programs
                <Icon name="arrow-right" className="h-4 w-4" />
              </ButtonLink>
            </div>
          </>
        ) : (
          <EmptyState
            icon="layers"
            title="No programs published yet"
            description="Programs added in the Admin Panel appear here automatically. Add the first program from Admin Panel → Programs."
          />
        )}
      </Section>

      {/* ========================================
          4. SUPPORT OUR MISSION
          ======================================== */}
      {/* The one band on the page that is impossible to scroll past without
          noticing. It leads to the real donation flow - never to a fake
          "payment successful" screen. */}
      <DonateBand />

      {/* ========================================
          5. PROJECTS / OUR WORKS PREVIEW
          ======================================== */}
      <Section>
        <SectionHeading
          eyebrow="Projects"
          icon="briefcase"
          title="Projects and works"
          description="Longer-term projects and the day-to-day work behind them."
        />

        {data.projects.rows.length > 0 || data.works.rows.length > 0 ? (
          <>
            <CardGrid>
              {[...data.projects.rows, ...data.works.rows]
                .slice(0, 3)
                .map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
            </CardGrid>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/projects" variant="outline">
                All projects
              </ButtonLink>
              <ButtonLink href="/our-works" variant="outline">
                Our works
              </ButtonLink>
            </div>
          </>
        ) : (
          <EmptyState
            icon="briefcase"
            title="No projects published yet"
            description="Add projects from Admin Panel → Projects & Our Works. Choose type 'Project' or 'Our Work' to decide which page it appears on."
          />
        )}
      </Section>

      {/* ========================================
          5. IMPACT SECTION
          These numbers come from Admin Panel → Settings → Impact numbers.
          While they are empty this whole block stays hidden, so the website
          never shows invented statistics.
          ======================================== */}
      <StatGrid title="Our impact so far" />

      {/* ========================================
          6. BENEFICIARIES
          ======================================== */}
      {data.beneficiaries.length > 0 ? (
        <Section>
          <SectionHeading
            eyebrow="Beneficiaries"
            icon="users"
            title="Who we serve"
            description="The groups of people our work is designed to support."
            align="center"
          />

          <CardGrid columns={3}>
            {data.beneficiaries.slice(0, 6).map((category) => (
              <BeneficiaryCard key={category.id} category={category} />
            ))}
          </CardGrid>

          <div className="mt-8 text-center">
            <ButtonLink href="/beneficiaries" variant="outline">
              Learn more
            </ButtonLink>
          </div>
        </Section>
      ) : null}

      {/* ========================================
          7. WOMEN EMPOWERED
          ======================================== */}
      {womenIntro ? (
        <Section muted>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="eyebrow mb-2">
                <Icon name="sparkles" className="h-4 w-4" />
                Women empowered
              </p>

              <h2 className="font-display text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
                {womenIntro.title}
              </h2>

              {womenIntro.subtitle ? (
                <p className="mt-2 text-sm font-medium text-brand-700">{womenIntro.subtitle}</p>
              ) : null}

              <p className="mt-4 text-base leading-relaxed text-ink-600">{womenIntro.body}</p>

              <ButtonLink href="/women-empowered" variant="primary" className="mt-6">
                More about this work
              </ButtonLink>
            </div>

            <div className="card bg-white p-6">
              <h3 className="text-base font-bold text-ink-900">What this work includes</h3>
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
            </div>
          </div>
        </Section>
      ) : null}

      {/* ========================================
          8. UPCOMING EVENTS
          ======================================== */}
      <Section>
        <SectionHeading
          eyebrow="Events"
          icon="calendar"
          title="Upcoming events"
          description="Programs and gatherings open to the community."
        />

        {data.events.rows.length > 0 ? (
          <>
            <CardGrid>
              {data.events.rows.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </CardGrid>

            <div className="mt-8 text-center">
              <ButtonLink href="/events" variant="outline">
                All events
              </ButtonLink>
            </div>
          </>
        ) : (
          <EmptyState
            icon="calendar"
            title="No upcoming events right now"
            description="Events with a future date appear here automatically. Add them from Admin Panel → Events, or view past events on the events page."
          />
        )}
      </Section>

      {/* ========================================
          9. LATEST NEWS / NOTICES
          ======================================== */}
      <Section muted>
        <SectionHeading
          eyebrow="News"
          icon="megaphone"
          title="Latest news and notices"
          description="Updates, announcements and stories from our work."
        />

        {data.news.rows.length > 0 ? (
          <>
            <CardGrid>
              {data.news.rows.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </CardGrid>

            <div className="mt-8 text-center">
              <ButtonLink href="/news" variant="outline">
                Read all news
              </ButtonLink>
            </div>
          </>
        ) : (
          <EmptyState
            icon="megaphone"
            title="No news published yet"
            description="News and notices created in the Admin Panel appear here automatically."
          />
        )}
      </Section>

      {/* ========================================
          10. GALLERY PREVIEW
          ======================================== */}
      {data.photos.length > 0 ? (
        <Section>
          <SectionHeading
            eyebrow="Gallery"
            icon="image"
            title="From our gallery"
            description="Photographs from our activities and events."
          />

          <GalleryGrid photos={data.photos} />

          <div className="mt-8 text-center">
            <ButtonLink href="/gallery" variant="outline">
              Open full gallery
            </ButtonLink>
          </div>
        </Section>
      ) : null}

      {/* ========================================
          OUR MEMBERS AND VOLUNTEERS
          ======================================== */}
      {/* Names, posts and photos only - the same fields the public members page
          already shows. Nothing private is selected from the database. */}
      <MembersStrip members={memberCards} />

      {/* ========================================
          11. DONOR / SUPPORTER SECTION
          Only donors marked as public by an administrator are shown.
          ======================================== */}
      {topDonors.length > 0 ? (
        <Section muted>
          <SectionHeading
            eyebrow="Supporters"
            icon="heart"
            title="Our Donors & Supporters"
            description="The people and organizations who make this work possible. Click a photo to read about their contribution."
            align="center"
          />

          {/* Same gallery as /donors, limited to the first few faces. The cards
              carry a photo and a name; the full details open on a click. */}
          <DonorGallery donors={galleryDonors} />

          <div className="mt-8 text-center">
            <ButtonLink href="/donors" variant="outline">
              All supporters
            </ButtonLink>
          </div>
        </Section>
      ) : null}

      {/* ========================================
          DONOR ACCOUNT
          Sign in, create an account, FORGOT PASSWORD and confirm your
          email - all reachable from the home page, not only by guessing
          the address.
          ======================================== */}
      <DonorAccountBand />

      {/* ========================================
          12. CALLS TO ACTION (JOIN / DONATE / CONTACT)
          ======================================== */}
      <section className="relative overflow-hidden bg-brand-800 text-white">
        <Container className="py-14 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Be part of the change
            </h2>
            <p className="mt-3 text-brand-100">
              There are many ways to help - join as a volunteer, support a program, or simply get
              in touch to learn more.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/join" variant="accent" size="lg">
                <Icon name="user-plus" className="h-5 w-5" />
                Join our community
              </ButtonLink>

              <ButtonLink href="/donate" variant="outline-light" size="lg">
                <Icon name="heart" className="h-5 w-5" />
                Donate
              </ButtonLink>

              <ButtonLink href="/contact" variant="outline-light" size="lg">
                <Icon name="mail" className="h-5 w-5" />
                Contact us
              </ButtonLink>
            </div>

            <p className="mt-6 text-xs text-brand-200">
              Already a member?{' '}
              <Link href="/member/login" className="font-semibold text-white underline">
                Sign in to your member panel
              </Link>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
