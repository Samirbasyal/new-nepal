// ========================================
// MEMBER PANEL - YOUR ROLE & RESPONSIBILITIES
// ========================================
// Address: /member/duties  (तपाईंको पद तथा जिम्मेवारी)
//
// WHO SEES WHAT
//   The committee record is found through KaryaSamitiMember.userId = the
//   signed-in member's id. The duties are then read for THAT member row only.
//
//   A member with no committee record gets a plain explanation, not an empty
//   screen. A member cannot pass somebody else's id: there is no id in the
//   address bar at all.
// ========================================

import type { Metadata } from 'next';
import { requireMember } from '@/lib/auth/guards';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { SectionHeading } from '@/components/ui/Section';
import { Alert } from '@/components/ui/Alert';
import { DutyList, type MemberDuty } from '@/components/member/DutyList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your role & responsibilities',
  robots: { index: false, follow: false },
};

export default async function MemberDutiesPage() {
  const user = await requireMember();

  if (!isDatabaseConfigured()) {
    return <Alert tone="warning" title="The database is not set up yet" />;
  }

  // The committee row that belongs to this login, if there is one.
  const committeeMember = await prisma.karyaSamitiMember.findFirst({
    where: { userId: user.id, isDeleted: false },
    select: { id: true, fullName: true, postTitle: true },
  });

  const rows = committeeMember
    ? await prisma.committeeDuty.findMany({
        where: { memberId: committeeMember.id },
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          instructions: true,
          deadline: true,
          status: true,
          createdAt: true,
        },
      })
    : [];

  const duties: MemberDuty[] = rows.map((duty) => ({
    id: duty.id,
    title: duty.title,
    description: duty.description,
    instructions: duty.instructions,
    deadline: duty.deadline ? duty.deadline.toISOString() : null,
    status: duty.status,
    createdAt: duty.createdAt.toISOString(),
  }));

  return (
    <div>
      <SectionHeading
        eyebrow={committeeMember ? committeeMember.postTitle : 'Committee'}
        icon="users"
        title="Your Role & Responsibilities"
        description={
          committeeMember
            ? `Duties given to you by the office as ${committeeMember.postTitle}.`
            : 'Responsibilities given to you by the office.'
        }
      />

      {committeeMember ? (
        <DutyList duties={duties} postTitle={committeeMember.postTitle} />
      ) : (
        <Alert tone="info" title="You are not on the committee list yet">
          Your login is not linked to a Karya Samiti record, so there are no committee duties to
          show. If you hold a post, ask the office to link your account on the Karya Samiti page.
        </Alert>
      )}
    </div>
  );
}
