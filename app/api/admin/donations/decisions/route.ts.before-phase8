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
import { buildNotificationEmail } from '@/lib/email/templates';
import { isEmailConfigured, sendMail } from '@/lib/email/mailer';
import { formatMoney } from '@/lib/utils';

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
      action === 'VERIFY'
        ? 'VERIFIED'
        : action === 'REJECT'
          ? 'REJECTED'
          : action === 'INFO_REQUIRED'
            ? 'INFO_REQUIRED'
            : 'PENDING';

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
    if ((nextStatus === 'REJECTED' || nextStatus === 'INFO_REQUIRED') && !remarks) {
      return fail(
        nextStatus === 'REJECTED'
          ? 'Please write why the donation is being rejected.'
          : 'Please write what you need from the donor.',
        422,
        { remarks: 'A reason is required.' },
      );
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

    // ---------- tell the donor, when the website can actually send mail ----------
    // Only when SMTP has been configured. isEmailConfigured() is checked first so
    // the office is never told "the donor has been emailed" on a site that has no
    // mail server - that promise would be false, and a donor waiting for a
    // message that never arrives would ring the office.
    if (donation.donorEmail && nextStatus !== 'PENDING' && isEmailConfigured()) {
      const subject =
        nextStatus === 'VERIFIED'
          ? `Your donation is confirmed - ${formatMoney(donation.amount)}`
          : nextStatus === 'REJECTED'
            ? `About your donation - ${formatMoney(donation.amount)}`
            : `We need a little more information about your donation`;

      const message =
        nextStatus === 'VERIFIED'
          ? `Thank you. Your donation of ${formatMoney(donation.amount)} has been verified by the office. Your kindness makes a real difference.`
          : nextStatus === 'REJECTED'
            ? `We could not confirm your donation of ${formatMoney(donation.amount)}. Please contact the office to sort it out.${remarks ? ` Reason given: ${remarks}` : ''}`
            : `We need one more thing before we can confirm your donation of ${formatMoney(donation.amount)}. Please contact the office.${remarks ? ` Note: ${remarks}` : ''}`;

      const mail = buildNotificationEmail({
        memberName: donation.donorName,
        title: subject,
        message,
        link: `/donate/submitted/${donation.id}`,
        linkLabel: 'See my donation',
      });

      // Not awaited: the administrator's decision must not wait for a mail server.
      void sendMail({
        to: donation.donorEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }).catch(() => undefined);
    }

    return ok(
      { id: updated.id, status: updated.status },
      200,
      nextStatus === 'VERIFIED'
        ? 'Donation verified.'
        : nextStatus === 'REJECTED'
          ? 'Donation rejected.'
          : nextStatus === 'INFO_REQUIRED'
            ? 'The donation is still waiting, and your question was saved for the donor.'
            : 'Donation moved back to waiting.',
    );
  } catch (error) {
    console.error('[donations] the decision could not be saved:', error);
    return serverError();
  }
}
