// ========================================
// API - DELETE ONE DONATION FOR GOOD
// ========================================
// Address: DELETE /api/admin/donations/<id>/permanent
// Body:    { confirm: "DELETE", reason?: string }
//
// WHY A SEPARATE ROUTE
//   The ordinary DELETE on this resource hides a donation (isDeleted = true) and
//   is what the office should use day to day. This one destroys the row, so it
//   gets its own address, its own guard, and a word that has to be typed before
//   anything happens. A single mis-click can never reach it.
//
// WHO MAY CALL IT
//   An administrator or super administrator, checked on the server by
//   requireAdminApi - the button being hidden is not the protection.
//
// WHAT IT DELETES
//   The donation row and the notification bell lines that point at it, in one
//   transaction (lib/donation/delete.ts). The receipt picture is removed from
//   storage afterwards, and only if no other record uses it. The donor account,
//   the member fund and the audit log are untouched.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError } from '@/lib/api/http';
import { isDatabaseConfigured } from '@/lib/prisma';
import { DonationDeleteError, permanentlyDeleteDonation } from '@/lib/donation/delete';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const { id } = await params;
  const donationId = String(id ?? '').trim();

  if (!donationId) return fail('The donation to delete was not named.', 400);

  const body = (await readJson(request)) as { confirm?: string; reason?: string } | null;

  // The typed word. The form asks for it in capitals, and the server insists on
  // it too, so a script or a stray key press cannot delete money records.
  if (String(body?.confirm ?? '').trim().toUpperCase() !== 'DELETE') {
    return fail('Please type DELETE in the confirmation box to continue.', 422);
  }

  try {
    const result = await permanentlyDeleteDonation(donationId, {
      id: auth.user.id,
      name: auth.user.name,
    });

    // Every screen that shows a total or a list of donations.
    revalidatePath('/admin/donations');
    revalidatePath('/admin/donations/removed');
    revalidatePath(`/admin/donations/${donationId}`);
    revalidatePath('/admin');
    revalidatePath('/donor/dashboard');

    const parts = [
      `${result.donorName} - ${result.currency} ${result.amount} was deleted permanently.`,
    ];

    if (result.notificationsRemoved > 0) {
      parts.push(
        `${result.notificationsRemoved} related notification${result.notificationsRemoved === 1 ? ' was' : 's were'} removed.`,
      );
    }

    if (result.receiptNote) parts.push(result.receiptNote);

    return ok(
      {
        id: result.id,
        receiptDeleted: result.receiptDeleted,
        notificationsRemoved: result.notificationsRemoved,
      },
      200,
      parts.join(' '),
    );
  } catch (error) {
    if (error instanceof DonationDeleteError) {
      return fail(error.message, error.status);
    }

    console.error('[donations] permanent delete failed:', error);
    return serverError();
  }
}
