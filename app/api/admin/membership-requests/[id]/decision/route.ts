// ========================================
// API - APPROVE OR REJECT A MEMBERSHIP REQUEST
// ========================================
// Address: POST /api/admin/membership-requests/<id>/decision
//          body: { action: "APPROVE" | "REJECT", rejectionReason?: string }
//
// APPROVING DOES NOT CREATE AN ACCOUNT.
//   It records the decision and creates ONE single-use activation link. The
//   account itself is created by the applicant on /member/activate, where they
//   choose their own password. That is what keeps the promise that no
//   administrator ever knows or assigns a password.
//
// THE ANSWER TELLS THE TRUTH ABOUT THE EMAIL
//   activation.emailSent === true  -> the mail server accepted the message, the
//                                     office can close the page.
//   activation.emailSent === false -> nothing was sent (no SMTP, or the server
//                                     refused). The link is returned so the
//                                     administrator can pass it on by phone,
//                                     WhatsApp or in person, and the screen says
//                                     so in plain words instead of pretending.
// ========================================

import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { requestOrigin } from '@/lib/auth/verification';
import { membershipDecisionSchema } from '@/lib/membership/schemas';
import { approveRequest, rejectRequest } from '@/lib/membership/service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await readJson(request);
  if (!body) return fail('The request could not be read. Please try again.', 400);

  const parsed = membershipDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  if (parsed.data.action === 'APPROVE') {
    // The origin the administrator is working from, so the emailed activation
    // link opens on the member's phone instead of pointing at localhost.
    const result = await approveRequest({
      id,
      adminId: auth.user.id,
      adminName: auth.user.name,
      baseUrl: requestOrigin(request),
    });
    if (!result.ok) return fail(result.message, 409);

    const emailed = result.activation?.emailed ?? false;

    return ok(
      {
        status: result.status,
        activation: result.activation
          ? {
              link: result.activation.link,
              emailed,
              emailError: result.activation.emailError ?? null,
            }
          : null,
      },
      200,
      emailed
        ? 'Approved. The activation link has been emailed to the applicant.'
        : 'Approved. No email was sent - copy the activation link below and pass it to the applicant yourself.',
    );
  }

  const result = await rejectRequest({
    id,
    adminId: auth.user.id,
    adminName: auth.user.name,
    reason: parsed.data.rejectionReason,
  });
  if (!result.ok) return fail(result.message, 409);

  return ok({ status: result.status }, 200, 'The request has been rejected.');
}
