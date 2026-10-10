// ========================================
// DONOR SECTION
// This code controls the Donor / Supporters page.
// ========================================
// WHAT IS PUBLIC
//   Only donors that an administrator has switched to PUBLIC appear here
//   (Admin Panel -> Donors -> "Show publicly").
//
// WHAT IS NEVER PUBLIC
//   Donation amounts, payment references, bank details, contact details and
//   internal notes. None of those are stored in the "donors" table at all -
//   money records live in a separate, private table (Admin Panel -> Donations
//   received) which is never shown on the public website.
// ========================================

import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { DonorCard } from '@/components/public/Cards';
import { getPublicDonors } from '@/lib/data/public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Donors and supporters',
  description:
    'Organizations and individuals who support the work of Janakalyan Samataa Yuwa Club.',
};

export default async function DonorsPage() {
  const donors = await getPublicDonors();

  // Group donors by the area they support, so the page reads like a
  // professional supporters wall.
  const byArea = new Map<string, typeof donors>();
  for (const donor of donors) {
    const area = donor.supportArea?.trim() || 'General support';
    const list = byArea.get(area) ?? [];
    list.push(donor);
    byArea.set(area, list);
  }

  return (
    <>
      <PageHero
        eyebrow="Supporters"
        icon="heart"
        title="Our donors and supporters"
        description="With sincere thanks to the organizations and individuals who make this work possible."
      />

      {/* ========================================
          DONOR CARDS
          ======================================== */}
      {donors.length > 0 ? (
        [...byArea.entries()].map(([area, list], index) => (
          <Section key={area} muted={index % 2 === 1}>
            <SectionHeading
              eyebrow={area}
              icon="heart"
              title={area}
              description={`${list.length} supporter${list.length === 1 ? '' : 's'} in this area.`}
            />

            <CardGrid columns={3}>
              {list.map((donor) => (
                <DonorCard key={donor.id} donor={donor} />
              ))}
            </CardGrid>
          </Section>
        ))
      ) : (
        <Section>
          <EmptyState
            icon="heart"
            title="Our supporters will be listed here"
            description="Add donors and supporters from Admin Panel → Donors, then switch on 'Show publicly'. Their names, logos and the area they support will appear on this page. Donation amounts and payment details are never shown publicly."
          />
        </Section>
      )}

      {/* ========================================
          THANK YOU + CALL TO ACTION
          ======================================== */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <Icon name="heart" className="h-6 w-6" />
          </span>

          <h2 className="font-display text-2xl font-bold text-ink-900">Become a supporter</h2>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            Support can take many forms - a one-time contribution, regular help with a program, or
            skills and materials. Every kind of support matters.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/donate" variant="accent" size="lg">
              <Icon name="heart" className="h-5 w-5" />
              Donate
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline" size="lg">
              <Icon name="mail" className="h-5 w-5" />
              Talk to us about supporting
            </ButtonLink>
          </div>

          <p className="mt-6 text-xs text-ink-500">
            Donor privacy: we only publish the information a supporter agrees to share.
          </p>
        </div>
      </Section>
    </>
  );
}
