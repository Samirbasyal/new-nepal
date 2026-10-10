// ========================================
// API - FUND MANAGEMENT: APPROVE / REJECT / CANCEL
// ========================================
// Address: POST /api/admin/fund/decisions
//
// ONE endpoint handles every money decision, so the permission rules live in
// exactly one place:
//
//   type: 'payment' + action: 'approve'  -> any administrator
//   type: 'payment' + action: 'reject'   -> any administrator
//   type: 'payment' + action: 'cancel'   -> any administrator
//   type: 'expense' + action: 'approve'  -> SUPER ADMIN ONLY
//   type: 'expense' + action: 'reject'   -> any administrator
//
// WHY EXPENSE APPROVAL IS RESTRICTED
//   Approving an expense reduces the organization's balance. Splitting the job
//   between the person who records an expense and the person who approves it
//   is the basic control that stops a single account from moving money alone.
//
// The real work happens in lib/fund/service.ts, inside a database transaction.
// ========================================

import { z } from 'zod';
import { fail, ok, readJson, zodFieldErrors } from '@/lib/api/http';
import { requireAdminApi, requireSuperAdminApi } from '@/lib/api/guard';
import { UserFacingError } from '@/lib/api/crud';
import {
  approveExpense,
  approvePayment,
  cancelPayment,
  clientIp,
  rejectExpense,
  rejectPayment,
} from '@/lib/fund/service';

export const dynamic = 'force-dynamic';

// The decision request is validated before anything is touched.
const decisionRequestSchema = z
  .object({
    type: z.enum(['payment', 'expense'], {
      errorMap: () => ({ message: 'Unknown record type.' }),
    }),
    id: z.string().trim().min(1, 'The record id is required.'),
    action: z.enum(['approve', 'reject', 'cancel'], {
      errorMap: () => ({ message: 'Please choose approve, reject or cancel.' }),
    }),
    note: z.string().trim().max(600).optional().nullable(),
  })
  .refine(
    // Rejecting or cancelling always needs a reason, so the member or the
    // administrator understands what happened.
    (value) => value.action === 'approve' || (value.note ?? '').length >= 3,
    {
      message: 'Please write a short reason (at least 3 characters).',
      path: ['note'],
    },
  );

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = decisionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return fail('Please check the form and try again.', 422, zodFieldErrors(parsed.error));
  }

  const { type, id, action, note } = parsed.data;

  // A Super Administrator is needed for expense approval, otherwise a normal
  // administrator check is enough.
  const auth =
    type === 'expense' && action === 'approve'
      ? await requireSuperAdminApi(request)
      : await requireAdminApi(request);

  if (!auth.ok) return auth.response;

  const ip = clientIp(request);
  const cleanNote = (note ?? '').trim() || null;

  try {
    // ---------- PAYMENTS ----------
    if (type === 'payment') {
      if (action === 'approve') {
        const result = await approvePayment(id, auth.user, cleanNote, ip);
        return ok(result, 200, result.message);
      }
      if (action === 'reject') {
        const result = await rejectPayment(id, auth.user, cleanNote ?? '', ip);
        return ok(result, 200, result.message);
      }
      const result = await cancelPayment(id, auth.user, cleanNote, ip);
      return ok(result, 200, result.message);
    }

    // ---------- EXPENSES ----------
    if (action === 'approve') {
      const result = await approveExpense(id, auth.user, cleanNote, ip);
      return ok(result, 200, result.message);
    }
    if (action === 'reject') {
      const result = await rejectExpense(id, auth.user, cleanNote ?? '', ip);
      return ok(result, 200, result.message);
    }

    return fail('An expense cannot be cancelled from here. Reject it instead.', 400);
  } catch (error) {
    // Our own friendly messages (for example "already approved") are shown
    // exactly as written. Anything else is logged and hidden.
    if (error instanceof UserFacingError) {
      return fail(error.message, error.status);
    }

    console.error('[fund] decision failed:', error);
    return fail('The action could not be completed. Please try again.', 500);
  }
}
