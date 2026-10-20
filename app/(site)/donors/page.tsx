// ========================================
// PUBLIC - OUR DONORS & SUPPORTERS
// ========================================
// Address: /donors
//
// WHAT IS PUBLIC
//   Only donors an administrator has switched to Public (and that are still
//   active). The filter is in the query itself - getPublicDonors() asks the
//   database for isPublic: true - not in the template. A private record is never
//   loaded, so it cannot reach the HTML, a cached copy, or a data file.
//
// WHAT THE PAGE SENDS TO THE BROWSER
//   Five fields per donor, mapped by hand below. Address, occupation, purpose and
//   description travel with the page, but they are only rendered inside the
//   detail panel, which stays closed until a visitor clicks a card.
//
// WHY THE PHOTO IS A ROUTE, NOT A FILE ADDRESS
//   /api/donors/photo/<id> checks the record before answering, so a picture stops
//   loading the moment a donor is switched back to Private.
// ========================================

import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section } from '@/components/ui/Section';
import { DonorGallery, type PublicDonor } from '@/components/public/DonorGallery';
import { getPublicDonors } from '@/lib/data/public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Donors and supporters',
  description:
    'The individuals and organizations who support the work of Janakalyan Samataa Yuwa Club.',
};

export default async function DonorsPage() {
  
  const lang = await getLanguage();
const donors = await getPublicDonors();

  // ========================================
  // ONLY THESE FIELDS LEAVE THE SERVER
  // ========================================
  const galleryDonors: PublicDonor[] = donors.map((donor) => ({
    id: donor.id,
    name: donor.name,
    photoUrl: donor.logoUrl ? `/api/donors/photo/${donor.id}` : null,
    address: donor.address ?? null,
    occupation: donor.occupation ?? null,
    // Older records have no donationPurpose; the area they support reads
    // naturally in the same place.
    purpose: donor.donationPurpose ?? donor.supportArea ?? null,
    description: donor.description ?? null,
  }));

  return (
    <>
      <PageHero
        eyebrow={t(lang, 'donors.eyebrow')}
        icon="heart"
        title={t(lang, 'home.donors')}
        description="With sincere thanks to the people and organizations who make this work possible. Click a photo to read about their contribution."
      />

      {/* ========================================
          THE GALLERY
          ======================================== */}
      <Section>
        {galleryDonors.length > 0 ? (
          <DonorGallery donors={galleryDonors} />
        ) : (
          <EmptyState
            icon="heart"
            title="Our supporters will be listed here"
            description="Donors and supporters are added from the Admin Panel. Only records marked Public appear on this page - nothing is published by accident."
          />
        )}
      </Section>

      {/* ========================================
          THANK YOU + CALL TO ACTION
          ======================================== */}
      <Section muted>
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
            Donor privacy: we publish only what a supporter has agreed to share, and any donor can be
            withdrawn at any time.
          </p>
        </div>
      </Section>
    </>
  );
}
