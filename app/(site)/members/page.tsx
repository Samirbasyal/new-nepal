// ========================================
// MEMBERS SECTION
// This code controls the Members / Leadership page.
// ========================================
// PRIVACY IS THE MOST IMPORTANT PART OF THIS PAGE
//   Only members whose profile an administrator has marked as PUBLIC appear
//   here, and only these columns are read from the database:
//       name, photo, designation, department, short introduction, joining date
//
//   The following are NEVER selected and can therefore never leak:
//       email address, phone number, password hash, membership number,
//       address, login information, internal status and notes
//
//   You can see the exact list in lib/data/public.ts -> getPublicMembers().
//
// Members are managed in Admin Panel -> Members (tick "Show on public
// Members page").
// ========================================

import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { MemberCard } from '@/components/public/Cards';
import { getPublicMembers } from '@/lib/data/public';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Members and leadership',
  description:
    'The people who lead and support the work of Janakalyan Samataa Yuwa Club.',
};

export default async function MembersPage() {
  const members = await getPublicMembers();

  // A member is treated as "leadership" when they have a designation.
  const leaders = members.filter((member) => Boolean(member.designation));
  const otherMembers = members.filter((member) => !member.designation);

  return (
    <>
      <PageHero
        eyebrow="Members"
        icon="users"
        title="Our members and leadership"
        description="The people who plan, organise and carry out our work."
      />

      {/* ========================================
          LEADERSHIP
          ======================================== */}
      {leaders.length > 0 ? (
        <Section>
          <SectionHeading
            eyebrow="Leadership"
            icon="award"
            title="Leadership"
            description="Members who hold a responsibility in the organization."
          />

          <CardGrid columns={3}>
            {leaders.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {/* ========================================
          OTHER PUBLIC MEMBERS
          ======================================== */}
      {otherMembers.length > 0 ? (
        <Section muted={leaders.length > 0}>
          <SectionHeading
            eyebrow="Members"
            icon="users"
            title="Our members"
            description="Members who have agreed to be listed publicly."
          />

          <CardGrid columns={4}>
            {otherMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {/* ========================================
          EMPTY STATE
          ======================================== */}
      {members.length === 0 ? (
        <Section>
          <EmptyState
            icon="users"
            title="Member profiles will appear here"
            description="Add members from Admin Panel → Members, then tick 'Show on public Members page' for the people who agree to be listed. Private information such as email addresses, phone numbers and membership numbers is never shown on the public website."
          />
        </Section>
      ) : null}

      {/* ========================================
          PRIVACY NOTE + CALL TO ACTION
          ======================================== */}
      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
              <Icon name="shield-check" className="h-5 w-5 text-brand-600" />
              Your privacy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Only a member's name, photo, role and short introduction can ever appear on this
              page, and only after an administrator has switched their profile to public. Contact
              details, membership numbers and login information stay private.
            </p>
            {members.some((member) => member.joinedAt) ? (
              <p className="mt-3 text-xs text-ink-500">
                Earliest joining date shown: {formatDate(members.find((m) => m.joinedAt)?.joinedAt)}
              </p>
            ) : null}
          </div>

          <div className="card flex flex-col justify-center p-6 text-center">
            <h2 className="text-base font-bold text-ink-900">Become a member</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Join the community, take part in our activities and help shape what we do next.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/join" variant="primary">
                <Icon name="user-plus" className="h-4 w-4" />
                Join community
              </ButtonLink>
              <ButtonLink href="/member/portal?tab=register" variant="outline">
                Request membership
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
