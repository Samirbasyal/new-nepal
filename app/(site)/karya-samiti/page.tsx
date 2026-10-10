// ========================================
// PUBLIC WEBSITE
// This code controls the कार्य समिति (Karya Samiti) page.
// ========================================
// Address: /karya-samiti
//
// WHAT VISITORS SEE
//   For every current committee member: photo, full name, post and current
//   address. Nothing else.
//
// HOW THE PRIVATE INFORMATION IS KEPT PRIVATE
//   This page does not read the committee table itself. It calls
//   getPublicCommittee() in lib/karya/queries.ts, which SELECTS only the four
//   public columns. The private columns (phone, email, permanent address, date
//   of birth, citizenship, member number, joining dates, internal notes) are
//   never loaded from the database, so they cannot appear in the page source,
//   in the page's data or in anything Google could index.
//
//   Nothing on this page reads the Admin Panel API either.
//
// ORDER
//   Exactly the order the office set with the "Display order" field.
// ========================================

import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { CommitteeMemberCard } from '@/components/public/CommitteeMemberCard';
import { getFormerCommittee, getPublicCommittee } from '@/lib/karya/queries';
import { getSettings, setting } from '@/lib/settings';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'कार्य समिति (Working committee)',
  description:
    'The working committee of Janakalyan Samataa Yuwa Club - names, positions and current addresses of the members who lead the organization.',
  alternates: { canonical: '/karya-samiti' },
};

export default async function KaryaSamitiPage() {
  const settings = await getSettings();

  // The office can switch former members on in Settings -> Karya Samiti.
  const showFormer = setting(settings, 'karya.showFormer', 'false').toLowerCase() === 'true';

  const [members, former] = await Promise.all([
    getPublicCommittee(false),
    showFormer ? getFormerCommittee() : Promise.resolve([]),
  ]);

  const intro = setting(
    settings,
    'karya.intro',
    'Our कार्य समिति (working committee) plans the work of the organization and is answerable to the general assembly.',
  );

  return (
    <>
      <PageHero
        eyebrow="Our organization"
        icon="users"
        title="कार्य समिति"
        description={intro}
      />

      {/* ========================================
          CURRENT COMMITTEE MEMBERS
          ======================================== */}
      <Section>
        <SectionHeading
          eyebrow="Working committee"
          icon="users"
          title="Our committee members"
          description={
            members.length > 0
              ? `${members.length} member${members.length === 1 ? '' : 's'} currently serving.`
              : undefined
          }
        />

        {members.length > 0 ? (
          <CardGrid columns={4}>
            {members.map((member) => (
              <CommitteeMemberCard key={member.id} member={member} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState
            icon="users"
            title="The committee will be listed here"
            description="Add the members of the कार्य समिति from Admin Panel → Karya Samiti. Their photo, name, post and current address appear on this page in the order you set."
          />
        )}
      </Section>

      {/* ========================================
          FORMER COMMITTEE MEMBERS (optional)
          Shown only when the office switched them on in Settings.
          ======================================== */}
      {showFormer && former.length > 0 ? (
        <Section muted>
          <SectionHeading
            eyebrow="With thanks"
            icon="heart"
            title="Former committee members"
            description="People who served the organization in earlier committees."
          />

          <CardGrid columns={4}>
            {former.map((member) => (
              <CommitteeMemberCard key={member.id} member={member} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {/* ========================================
          A NOTE ABOUT PRIVACY (builds trust, and is true)
          ======================================== */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="shield" className="h-6 w-6" />
          </span>

          <h2 className="font-display text-2xl font-bold text-ink-900">
            About this list
          </h2>

          <p className="mt-3 text-base leading-relaxed text-ink-600">
            Only the name, position, current address and photograph are published. Phone numbers,
            email addresses, permanent addresses, citizenship details and internal notes are kept
            private for the organization&apos;s records and are never published on this website.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/about" variant="outline" size="lg">
              <Icon name="info" className="h-5 w-5" />
              About {organization.shortName}
            </ButtonLink>
            <ButtonLink href="/contact" variant="primary" size="lg">
              <Icon name="mail" className="h-5 w-5" />
              Contact the committee
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
