// ========================================
// API - MEMBER PANEL: UPDATE MY DUTY STATUS
// ========================================
// Address: POST /api/member/duties/<dutyId>
// Body:    { status: "IN_PROGRESS" | "COMPLETED" }
//
// WHAT A MEMBER MAY DO
//   Move their OWN committee duty between Pending -> In progress -> Completed.
//
// WHAT A MEMBER MAY NOT DO
//   - change the title, the description, the private instructions or the deadline
//   - complete a duty that belongs to somebody else
//   - create or delete duties (that is the administrator's job)
//
// The ownership check joins through karya_samiti_members.user_id, so a member can
// only ever touch a duty that was given to the committee row linked to THEIR
// login.
// ========================================

import { requireMemberApi } from '@/lib/api/guard';
import { fail, ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await readJson(request)) as { status?: string } | null;
  const requested = String(body?.status ?? '').toUpperCase();

  if (!ALLOWED.includes(requested)) {
    return fail('Please choose a valid status.', 422);
  }

  // ---------- Ownership ----------
  const committeeMember = await prisma.karyaSamitiMember.findFirst({
    where: { userId: auth.user.id, isDeleted: false },
    select: { id: true },
  });

  if (!committeeMember) {
    return fail('No committee record is linked to your account.', 403);
  }

  const duty = await prisma.committeeDuty.findFirst({
    where: { id, memberId: committeeMember.id },
    select: { id: true },
  });

  if (!duty) {
    return fail('That responsibility could not be found, or it is not yours.', 404);
  }

  const updated = await prisma.committeeDuty.update({
    where: { id: duty.id },
    data: {
      status: requested,
      completedAt: requested === 'COMPLETED' ? new Date() : null,
      updatedById: auth.user.id,
    },
    select: { id: true, status: true, completedAt: true },
  });

  return ok(updated, 200, requested === 'COMPLETED' ? 'Marked as completed.' : 'Status updated.');
}
