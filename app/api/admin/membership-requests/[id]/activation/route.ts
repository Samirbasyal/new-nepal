// ========================================
// API - ISSUE A FRESH ACTIVATION LINK
// ========================================
// Address: POST /api/admin/membership-requests/<id>/activation
//
// WHEN THIS IS NEEDED
//   - the seven-day link expired before the applicant opened it
//   - the approval email went to an address they cannot reach any more
//   - the applicant lost the message
//
// WHAT IT DOES TO THE OLD LINK
//   Replaces it. The previous link stops working the moment a new one is created,
//   which means an administrator can safely cancel a link that was sent to the
//   wrong person.
//
// It never creates an account, and it refuses when the applicant has already
// activated - in that case there is nothing left to activate and the reply says
// so, instead of handing out a link that cannot work.
// ========================================

import { fail, ok } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { prisma } from '@/lib/prisma';
import { writeActivity } from '@/lib/audit';
import { isEmailConfigured, sendMail } from '@/lib/email/mailer';
import { buildMembershipApprovedEmail } from '@/lib/email/templates';
import { ACTIVATION_MINUTES, issueActivation } from '@/lib/membership/tokens';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const found = await prisma.membershipRequest.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      userId: true,
      activatedAt: true,
    },
  });

  if (!found) return fail('This request no longer exists.', 404);

  if (found.status !== 'APPROVED') {
    return fail('Only an approved request can have an activation link. Approve it first.', 409);
  }

  if (found.userId || found.activatedAt) {
    return fail('This applicant has already activated their account, so a new link is not needed.', 409);
  }

  const issued = await issueActivation(found.id);

  let emailed = false;
  let emailError: string | null = null;

  if (isEmailConfigured()) {
    const mail = buildMembershipApprovedEmail({
      applicantName: found.fullName,
      link: issued.link,
      expiresMinutes: ACTIVATION_MINUTES,
    });

    const result = await sendMail({
      to: found.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    emailed = result.ok;
    emailError = result.ok ? null : (result.error ?? 'The mail server refused the message.');

    await prisma.membershipRequest.update({
      where: { id: found.id },
      data: { activationSentAt: new Date(), activationEmailSent: emailed },
    });
  }

  await writeActivity({
    actorId: auth.user.id,
    actorName: auth.user.name,
    action: 'UPDATE',
    entity: 'Membership request',
    entityId: found.id,
    detail: emailed
      ? `New activation link for ${found.fullName} <${found.email}> (emailed).`
      : `New activation link for ${found.fullName} <${found.email}> (not emailed - shown to the administrator).`,
  });

  return ok(
    { link: issued.link, emailed, emailError, expiresAt: issued.expiresAt.toISOString() },
    200,
    emailed
      ? 'A new link has been emailed to the applicant. The old link no longer works.'
      : 'A new link has been created. No email was sent - copy it and pass it to the applicant yourself.',
  );
}
