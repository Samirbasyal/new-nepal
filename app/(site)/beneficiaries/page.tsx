// ========================================
// BENEFICIARIES SECTION
// This code controls the Beneficiaries page.
// ========================================
// WHO WE SERVE
//   The categories on this page are fully configurable from
//   Admin Panel -> Beneficiaries. Nothing is hard-coded, so the organization
//   can add, rename, reorder or hide any group (Youth, Women, Children,
//   Families, Local communities, Vulnerable groups, or anything else).
//
// NUMBERS
//   A count is shown ONLY when a real figure has been entered in the Admin
//   Panel. If the box is left empty, no number appears - we never invent
//   beneficiary statistics.
// ========================================

import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { BeneficiaryCard } from '@/components/public/Cards';
import { ContentSectionGrid } from '@/components/public/ContentSectionView';
import { getBeneficiaryCategories, getContentByGroup } from '@/lib/data/public';
import { formatNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Beneficiaries',
  description:
    'The groups of people Janakalyan Samataa Yuwa Club works with - youth, women, children, families and local communities.',
};

export default async function BeneficiariesPage() {
  const [categories, content] = await Promise.all([
    getBeneficiaryCategories(),
    getContentByGroup('BENEFICIARIES'),
  ]);

  // Counts are only summed for categories that have a real number.
  const withNumbers = categories.filter(
    (category) => typeof category.beneficiaryCount === 'number',
  );
  const totalReported = withNumbers.reduce(
    (sum, category) => sum + (category.beneficiaryCount ?? 0),
    0,
  );
  const countUnit = withNumbers[0]?.countLabel || 'people supported';

  return (
    <>
      <PageHero
        eyebrow="Beneficiaries"
        icon="users"
        title="Who we serve"
        description="Our work is designed around the people and communities who need it most."
      />

      {/* ========================================
          INTRODUCTORY TEXT (Admin Panel -> Content sections)
          ======================================== */}
      {content.length > 0 ? (
        <Section>
          <div className="mx-auto max-w-4xl">
            <ContentSectionGrid sections={content} columns={1} />
          </div>
        </Section>
      ) : null}

      {/* ========================================
          CATEGORY CARDS
          ======================================== */}
      <Section muted={content.length > 0}>
        <SectionHeading
          eyebrow="Our focus groups"
          icon="target"
          title="Groups we work with"
          description="Each group is described honestly - with a number only where the organization has a verified figure."
        />

        {categories.length > 0 ? (
          <>
            <CardGrid columns={3}>
              {categories.map((category) => (
                <BeneficiaryCard key={category.id} category={category} />
              ))}
            </CardGrid>

            {/* A total is shown ONLY when at least one real number exists. */}
            {withNumbers.length > 0 ? (
              <div className="mt-8 rounded-card border border-ink-200 bg-white p-6 text-center">
                <p className="text-3xl font-bold text-brand-700">
                  {formatNumber(totalReported)}
                </p>
                <p className="mt-1 text-sm text-ink-600">{countUnit} (across the categories above)</p>
                <p className="mt-3 text-xs text-ink-500">
                  Figures are entered by the organization in Admin Panel → Beneficiaries. Categories
                  without a verified number simply show no figure.
                </p>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-ink-500">
                Beneficiary numbers are not published yet. When the organization records verified
                figures in the Admin Panel they will appear here.
              </p>
            )}
          </>
        ) : (
          <EmptyState
            icon="users"
            title="Beneficiary groups will be listed here"
            description="Add the groups you work with (youth, women, children, families, local communities...) from Admin Panel → Beneficiaries. A number is optional and is only shown when you enter a real one."
          />
        )}
      </Section>

      {/* ========================================
          CALL TO ACTION
          ======================================== */}
      <Section>
        <div className="rounded-card bg-white p-8 text-center ring-1 ring-ink-200">
          <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">
            Know someone who needs support?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">
            Get in touch with our team and we will explain what we can do together.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact" variant="primary">
              <Icon name="mail" className="h-4 w-4" />
              Contact us
            </ButtonLink>
            <ButtonLink href="/programs" variant="outline">
              See our programs
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
