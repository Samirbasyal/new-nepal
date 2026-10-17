// ========================================
// API - RESTORE A REMOVED DONATION
// ========================================
// Address: POST /api/admin/donations/restore
// Body:    { id }
//
// WHY THIS EXISTS
//   Removing a donation is a SOFT delete: the row stays in the table, marked
//   isDeleted, and disappears from every total. That keeps the books explainable
//   ("we removed this one, on this date, because...") but it also means a
//   mistaken removal has to be undoable. Without a way back, the only option
//   would be to type the gift in again - which would lose its original dates,
//   receipt and history.
//
// WHO MAY DO IT
//   Any administrator - the same people who may remove a donation. The check is
//   on the server, not in the button.
//
// WHAT IS RECORDED
//   An activity line naming the person who restored it, so the audit trail stays
//   complete in both directions.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { writeActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const body = (await readJson(request)) as { id?: string } | null;
  const id = String(body?.id ?? '').trim();

  if (!id) return fail('The donation to restore was not named.', 400);

  try {
    const donation = await prisma.donation.findUnique({ where: { id } });

    if (!donation) return fail('That donation no longer exists.', 404);
    if (!donation.isDeleted) return fail('This donation is not removed, so there is nothing to restore.', 400);

    await prisma.donation.update({ where: { id }, data: { isDeleted: false } });

    await writeActivity({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'UPDATE',
      entity: 'Donation',
      entityId: id,
      detail: `restored ${donation.donorName}: ${donation.amount} ${donation.currency}`,
      oldValue: 'REMOVED',
      newValue: donation.status,
    });

    return ok({ id, status: donation.status }, 200, 'The donation has been restored.');
  } catch (error) {
    console.error('[donations] could not restore:', error);
    return serverError();
  }
}
