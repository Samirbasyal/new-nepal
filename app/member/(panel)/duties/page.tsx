import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
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
import { getMyResponsibilities } from '@/lib/members/service';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'member.duties'), robots: { index: false, follow: false } };
}

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

  // ---------- permanent duties that come with the POST ----------
  // Matched on the post title, so nothing has to be assigned by hand. Whoever
  // becomes अध्यक्ष sees the अध्यक्ष list on the day they are recorded.
  //
  // TWO WAYS A DUTY CAN BE MINE
  //   1. It was written for MY EMAIL (Admin -> Duties of each post -> member email).
  //      That is the normal way now: one person, one row.
  //   2. It carries no member at all (older rows) and the post title matches mine,
  //      so everybody holding that post sees it.
  const myPost = committeeMember?.postTitle ?? null;

  const permanentRows = await prisma.committeeRoleDuty.findMany({
    where: {
      isActive: true,
      OR: [
        { memberUserId: user.id },
        // A duty written before this person had an account still finds them, by
        // the address the office typed.
        { memberEmail: user.email.toLowerCase() },
        ...(myPost ? [{ memberUserId: null, memberEmail: null, postTitle: myPost }] : []),
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { description: true },
  });

  const permanent = permanentRows.map((row) => row.description);

  // ---------- permanent duties written by an administrator ----------
  // These come from the member file (Admin -> Member management), not from the
  // committee list, so EVERY member can see them - with or without a committee
  // record. They have no deadline and no expiry, by design.
  const assigned = await getMyResponsibilities(user.id);

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

      {assigned.length > 0 ? (
        <section className="mb-8 rounded-card border border-ink-200 bg-white p-5">
          <h2 className="text-base font-bold text-ink-900">Permanent responsibilities</h2>
          <p className="mt-1 text-xs text-ink-500">
            Assigned to you by the office. These are permanent duties - they have no deadline and
            they do not expire. Only an administrator can change them.
          </p>
          <ul className="mt-4 space-y-3">
            {assigned.map((duty) => (
              <li key={duty.id} className="rounded-btn border border-ink-200 p-3">
                {duty.title ? (
                  <p className="text-sm font-semibold text-ink-900">{duty.title}</p>
                ) : null}
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{duty.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------- duties written for THIS person by email ---------- */}
      {/* Shown here when the member has no committee record; when they do,
          DutyList already carries the same lines. */}
      {!committeeMember && permanent.length > 0 ? (
        <section className="mb-8 rounded-card border border-ink-200 bg-white p-5">
          <h2 className="text-base font-bold text-ink-900">Duties of your post</h2>
          <p className="mt-1 text-xs text-ink-500">
            Written for you by the office. These come with your post - they have no deadline and
            they do not expire.
          </p>
          <ul className="mt-4 space-y-2">
            {permanent.map((line) => (
              <li key={line} className="flex gap-2 text-sm leading-relaxed text-ink-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {committeeMember ? (
        <DutyList
          duties={duties}
          postTitle={committeeMember.postTitle}
          memberName={committeeMember.fullName}
          permanent={permanent}
        />
      ) : (
        <Alert tone="info" title="You are not on the committee list yet">
          Your login is not linked to a Karya Samiti record, so there are no committee duties to
          show. If you hold a post, ask the office to link your account on the Karya Samiti page.
        </Alert>
      )}
    </div>
  );
}
