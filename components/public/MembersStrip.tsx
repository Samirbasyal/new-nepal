// ========================================
// HOMEPAGE - OUR MEMBERS AND VOLUNTEERS
// ========================================
// A short row of faces, and a way through to the two pages that hold the full
// lists: /members and /karya-samiti.
//
// WHAT IS SHOWN
//   Name, designation and photo only - the same fields the public members page
//   already shows. Phone numbers, email addresses, membership numbers and home
//   addresses are NOT selected from the database, so they cannot appear here by
//   accident.
//
// WHEN IT HIDES
//   If no member has been marked public, the whole band is skipped rather than
//   showing an empty row.
// ========================================

import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Section, SectionHeading } from '@/components/ui/Section';

export type PublicMemberCard = {
  id: string;
  name: string;
  designation: string | null;
  photoUrl: string | null;
};

export function MembersStrip({ members }: { members: PublicMemberCard[] }) {
  if (members.length === 0) return null;

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Our people"
          icon="users"
          title="Our Members and Volunteers"
          description="The people who give their time to this work."
        />

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/members" variant="outline">
            All members
          </ButtonLink>
          <ButtonLink href="/karya-samiti" variant="outline">
            कार्य समिति
          </ButtonLink>
        </div>
      </div>

      <ul className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {members.map((member) => (
          <li key={member.id}>
            <Link
              href="/members"
              className="group block rounded-card text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border border-ink-200 bg-ink-100 sm:h-24 sm:w-24">
                {member.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700 to-accent-600 font-display text-lg font-bold text-white">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <p className="mt-2 truncate text-sm font-semibold text-ink-900">{member.name}</p>
              {member.designation ? (
                <p className="truncate text-xs text-ink-500">{member.designation}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
