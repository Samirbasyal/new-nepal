// ========================================
// PERMANENTLY DELETE ONE DONATION
// ========================================
// THE TWO KINDS OF "DELETE" IN THIS PROJECT
//
//   Remove   (the ordinary Delete button)
//            isDeleted = true. The row stays, the totals drop it. This is what
//            the office should normally use, because a record book that can
//            silently lose lines is not a record book.
//
//   Delete permanently   (this file)
//            The row is gone. Used for a demo, a duplicate, a test entry, or a
//            donation typed twice by mistake - the things that should never have
//            been in the book at all.
//
// WHAT ELSE IS ATTACHED TO A DONATION
//   Checked against the actual schema, not guessed:
//
//     notifications   the "new donation" bell lines carry the donation id in
//                     their link. They are deleted with it, otherwise a click
//                     would open a page that no longer exists.
//     receipt file    a private blob. Deleted only when no other donation row
//                     points at the same address.
//     activity log    KEPT ON PURPOSE. "Who deleted what, and when" is exactly
//                     the record an auditor asks for, so it is written after the
//                     deletion and never removed with it.
//     donor account   NEVER touched. Removing one gift must not disturb the
//                     person, their other gifts, or their ability to sign in.
//     member fund     NEVER touched. Donations and the monthly NPR 20 live in
//                     separate tables and never meet.
//
// ORDER OF WORK
//   1. read the row (so the audit line can name it afterwards)
//   2. one transaction: dependent notifications, then the donation itself
//   3. the receipt picture, outside the transaction (a file store cannot join one)
//   4. the audit line
//
//   If step 2 fails, nothing is deleted: the transaction rolls back, and no file
//   is touched because step 3 never runs. That is the "no half-deleted record"
//   guarantee.
// ========================================

import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { writeActivity } from '@/lib/audit';
import { deleteStoredFile } from '@/lib/storage';

export class DonationDeleteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'DonationDeleteError';
    this.status = status;
  }
}

export type PermanentDeleteResult = {
  id: string;
  donorName: string;
  amount: number;
  currency: string;
  status: string;
  /** null when there was no picture to remove. */
  receiptDeleted: boolean | null;
  /** A sentence for the administrator when the picture could not be removed. */
  receiptNote?: string;
  notificationsRemoved: number;
};

export async function permanentlyDeleteDonation(
  id: string,
  actor: { id: string; name: string },
): Promise<PermanentDeleteResult> {
  if (!isDatabaseConfigured()) {
    throw new DonationDeleteError('The database is not connected yet.', 503);
  }

  const donation = await prisma.donation.findUnique({ where: { id } });

  if (!donation) {
    throw new DonationDeleteError('This donation no longer exists.', 404);
  }

  // ---------- is the receipt picture shared? ----------
  // A donation could have been duplicated with the same screenshot attached. In
  // that case the file must survive, because the other record still needs it.
  const sharingCount = donation.receiptUrl
    ? await prisma.donation.count({
        where: { receiptUrl: donation.receiptUrl, id: { not: donation.id } },
      })
    : 0;

  let notificationsRemoved = 0;

  // ---------- everything the database must do, or none of it ----------
  await prisma.$transaction(async (tx) => {
    // 1. the bell lines that point at this donation
    const removed = await tx.notification.deleteMany({
      where: {
        OR: [
          { link: { contains: `/donate/submitted/${donation.id}` } },
          { link: { contains: `#donation-${donation.id}` } },
          { link: { contains: donation.id } },
        ],
      },
    });

    notificationsRemoved = removed.count;

    // 2. the donation itself
    await tx.donation.delete({ where: { id: donation.id } });
  });

  // ---------- the picture ----------
  let receiptDeleted: boolean | null = null;
  let receiptNote: string | undefined;

  if (donation.receiptUrl) {
    if (sharingCount > 0) {
      receiptDeleted = false;
      receiptNote = `The receipt picture was left in place because ${sharingCount} other donation record${
        sharingCount === 1 ? '' : 's'
      } still use it.`;
    } else {
      const outcome = await deleteStoredFile(donation.receiptUrl);

      if (outcome.deleted) {
        receiptDeleted = true;
        if (outcome.skipped) {
          receiptNote = 'The receipt picture was already gone from storage.';
        }
      } else if (outcome.skipped) {
        receiptDeleted = false;
        receiptNote = outcome.reason ?? 'The receipt picture was left in place.';
      } else {
        receiptDeleted = false;
        receiptNote =
          'The donation record is deleted, but its receipt picture could not be removed from storage. ' +
          'It can be deleted from the Vercel Blob dashboard if needed.';
      }
    }
  }

  // ---------- the audit line ----------
  // Written AFTER the row is gone, and deliberately kept forever: it is the only
  // remaining trace that this donation ever existed.
  await writeActivity({
    actorId: actor.id,
    actorName: actor.name,
    action: 'DELETE',
    entity: 'Donation',
    entityId: donation.id,
    detail:
      `deleted permanently ${donation.donorName}: ${donation.amount} ${donation.currency}` +
      ` - ${donation.purpose ?? 'General donation'}` +
      ` (was ${donation.status.toLowerCase()})`,
    oldValue: donation.status,
    newValue: 'DELETED',
  });

  return {
    id: donation.id,
    donorName: donation.donorName,
    amount: donation.amount,
    currency: donation.currency,
    status: donation.status,
    receiptDeleted,
    receiptNote,
    notificationsRemoved,
  };
}
