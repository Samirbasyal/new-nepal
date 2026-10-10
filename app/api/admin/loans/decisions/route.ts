// ========================================
// API - LOAN DECISIONS (SUPER ADMIN ONLY)
// ========================================
// Address: POST /api/admin/loans/decisions
//
// Body: { loanId, action, reason?, disbursedDate? }
//   action = UNDER_REVIEW | APPROVE | REJECT | DISBURSE | CANCEL
//
// WHY THIS ROUTE EXISTS INSTEAD OF A NORMAL FORM
//   A loan's status is never typed into a form. If it could be, a wrong dropdown
//   would say "completed" while the money is still out. Every step of a loan
//   therefore goes through this one address, which checks that the step makes
//   sense at this moment (for example: you cannot pay out a loan that was never
//   approved, and you cannot reject one that has already been paid out).
//
// WHO MAY DO IT
//   requireSuperAdminApi() - a Super Administrator only. A normal administrator
//   receives 403 and nothing changes.
//
// WHAT HAPPENS
//   lib/loan/service.ts writes the change, the audit line and the member's
//   notification together, and the loan balance is recalculated from the
//   repayment records.
// ========================================

import { UserFacingError } from '@/lib/api/crud';
import { requireSuperAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { loanDecisionSchema } from '@/lib/loan/schemas';
import { decideLoan } from '@/lib/loan/service';

export async function POST(request: Request) {
  // ---------- Authorization ----------
  const auth = await requireSuperAdminApi(request);
  if (!auth.ok) return auth.response;

  // ---------- Read and check the form ----------
  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = loanDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { loanId, action, reason, disbursedDate } = parsed.data;

  // ---------- Do it ----------
  try {
    const result = await decideLoan({
      loanId,
      action: action as 'UNDER_REVIEW' | 'APPROVE' | 'REJECT' | 'DISBURSE' | 'CANCEL',
      reason: reason ?? null,
      disbursedDate: disbursedDate ?? null,
      actor: { id: auth.user.id, name: auth.user.name },
    });

    return ok(result, 200, result.message);
  } catch (error) {
    // A message we wrote ourselves is safe to show. Anything else is a fault on
    // our side: the real error goes to the server log and the person sees a
    // plain sentence (never a Prisma or 500 message).
    if (error instanceof UserFacingError) {
      return fail(error.message, error.status);
    }

    console.error('[api] loan decision failed:', error);
    return serverError('Something went wrong. Please try again.');
  }
}
