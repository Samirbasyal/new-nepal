// ========================================
// API - LOAN REPAYMENTS (SUPER ADMIN ONLY)
// ========================================
// Addresses:
//   POST   /api/admin/loans/returns        -> record a repayment
//   DELETE /api/admin/loans/returns?id=... -> remove a wrongly typed one
//
// PARTIAL REPAYMENTS ARE THE NORMAL CASE
//   Rs. 50,000 borrowed, returned in 10,000 + 20,000 + 20,000. Each amount is
//   one row here, and the loan only becomes "Completed" when the sum reaches
//   the payable amount - which is recalculated from the records, never typed in.
//
// WHY THIS IS NOT A NORMAL CRUD TABLE
//   Adding a repayment changes the loan balance and possibly its status, and it
//   must notify the member. The generic engine knows nothing about any of that,
//   so repayments are only ever created and removed HERE, through
//   lib/loan/service.ts.
//
// PROTECTION AGAINST TYPING MISTAKES
//   - the amount must be more than zero
//   - it cannot be more than the outstanding balance
//   - a repayment cannot be recorded before the money was handed over
//   - nothing can be recorded against a rejected or cancelled loan
// ========================================

import { UserFacingError } from '@/lib/api/crud';
import { requireSuperAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { loanReturnSchema } from '@/lib/loan/schemas';
import { recordLoanReturn, removeLoanReturn } from '@/lib/loan/service';

// ========================================
// POST - RECORD A REPAYMENT
// ========================================
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = loanReturnSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  try {
    const result = await recordLoanReturn(parsed.data as unknown as Record<string, unknown>, {
      id: auth.user.id,
      name: auth.user.name,
    });

    return ok(
      result,
      201,
      result.remaining > 0
        ? `Repayment recorded. ${result.remaining.toLocaleString('en-IN')} is still outstanding.`
        : 'Repayment recorded. This loan is now fully repaid.',
    );
  } catch (error) {
    if (error instanceof UserFacingError) return fail(error.message, error.status);
    console.error('[api] recording a loan repayment failed:', error);
    return serverError('Something went wrong. Please try again.');
  }
}

// ========================================
// DELETE - REMOVE A REPAYMENT
// ========================================
// The row is hidden (isDeleted), never really removed, so the audit trail keeps
// the full story. The loan balance is recalculated immediately.
export async function DELETE(request: Request) {
  const auth = await requireSuperAdminApi(request);
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return fail('Which repayment should be removed?', 400);

  try {
    await removeLoanReturn(id, { id: auth.user.id, name: auth.user.name });
    return ok({ id }, 200, 'Repayment removed and the loan balance updated.');
  } catch (error) {
    if (error instanceof UserFacingError) return fail(error.message, error.status);
    console.error('[api] removing a loan repayment failed:', error);
    return serverError('Something went wrong. Please try again.');
  }
}
