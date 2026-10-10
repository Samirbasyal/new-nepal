// ========================================
// API - DONATION DECISIONS (VERIFY / REJECT)
// ========================================
// Address: POST /api/admin/donations/decisions
//
// Body: { id, action: "VERIFY" | "REJECT" | "PENDING", remarks? }
//
// WHY THIS IS A SEPARATE ROUTE
//   A donation's status is never typed into a form. If it could be, a wrong
//   dropdown would say "verified" before the office had checked the bank
//   statement. Every decision goes through here, which records WHO decided and
//   WHEN, and leaves an audit line that cannot be edited afterwards.
//
// WHAT COUNTS AS MONEY RECEIVED
//   Only a VERIFIED donation counts towards the donation totals on the screen.
//   Pending donations are shown separately, exactly like pending member fund
//   payments.
//
// DONATIONS ARE NOT MEMBER FUND
//   This route only touches the Donation table. The monthly fund and the loans
//   are separate tables with their own rules, and nothing here can change them.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { donationDecisionSchema } from '@/lib/donation/schemas';
import { writeActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = donationDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { id, action, remarks } = parsed.data;

  try {
    const donation = await prisma.donation.findUnique({ where: { id } });

    if (!donation || donation.isDeleted) {
      return fail('That donation no longer exists.', 404);
    }

    const before = donation.status;

    // ---------- the decision ----------
    const nextStatus =
      action === 'VERIFY' ? 'VERIFIED' : action === 'REJECT' ? 'REJECTED' : 'PENDING';

    if (before === nextStatus) {
      return fail(
        nextStatus === 'VERIFIED'
          ? 'This donation is already verified.'
          : nextStatus === 'REJECTED'
            ? 'This donation was already rejected.'
            : 'This donation is already waiting for verification.',
        400,
      );
    }

    // A reason is required when money is being refused, so the office can always
    // explain the decision later.
    if (nextStatus === 'REJECTED' && !remarks) {
      return fail('Please write why the donation is being rejected.', 422, {
        remarks: 'A reason is required.',
      });
    }

    const updated = await prisma.donation.update({
      where: { id },
      data: {
        status: nextStatus,
        remarks: remarks ?? donation.remarks,
        // Only a VERIFIED donation gets a verifier and a time.
        verifiedById: nextStatus === 'VERIFIED' ? auth.user.id : null,
        verifiedAt: nextStatus === 'VERIFIED' ? new Date() : null,
      },
    });

    // ---------- audit ----------
    await writeActivity({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: nextStatus === 'VERIFIED' ? 'APPROVE' : nextStatus === 'REJECTED' ? 'REJECT' : 'UPDATE',
      entity: 'Donation',
      entityId: id,
      detail: `${donation.donorName}: ${donation.amount} ${donation.currency}`,
      oldValue: before,
      newValue: nextStatus,
    });

    return ok(
      { id: updated.id, status: updated.status },
      200,
      nextStatus === 'VERIFIED'
        ? 'Donation verified.'
        : nextStatus === 'REJECTED'
          ? 'Donation rejected.'
          : 'Donation moved back to waiting.',
    );
  } catch (error) {
    console.error('[donations] the decision could not be saved:', error);
    return serverError();
  }
}
