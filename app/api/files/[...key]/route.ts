// ========================================
// API - SERVE A PRIVATE FILE (PAYMENT RECEIPTS, LOAN AGREEMENTS)
// ========================================
// Address: GET /api/files/private/uploads/2026/10/img-abc123.png
//
// WHY THIS ROUTE EXISTS
//   A payment receipt shows real financial detail: the amount, the date, the
//   bank or wallet, and the transaction number. If such a file were stored as an
//   ordinary picture, anybody who obtained the link - forwarded in a message,
//   left in a chat, guessed, or found in a browser history - could open it. One
//   member could also look at another member's receipt.
//
//   So private files are kept where the web server will NOT hand them out, and
//   every single request comes through here, where we decide who may look.
//
// WHO MAY OPEN A PRIVATE FILE
//   * An administrator or Super Administrator - they have to check receipts in
//     order to approve payments. This is the whole point of the approval step.
//   * The MEMBER who submitted it - they are allowed to see their own receipt.
//   * Nobody else. A different signed-in member receives 403 Forbidden, and a
//     visitor who is not signed in receives 401.
//
// HOW THE CHECK WORKS
//   The requested address is looked up in the member's OWN payment records. If
//   the receipt belongs to a payment of theirs, they may see it. If it belongs
//   to anybody else, they may not. The decision is made from the database, never
//   from anything the browser sent.
//
// CACHING
//   "private, no-store" is set on the answer, so no shared cache and no browser
//   may keep a copy that could later be shown to the wrong person.
// ========================================

import { fail } from '@/lib/api/http';
import { requireMemberApi } from '@/lib/api/guard';
import { isAdminRole } from '@/lib/constants';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { readStoredFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  // ---------- 1. Somebody must be signed in ----------
  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const { key } = await params;
  const fileKey = (Array.isArray(key) ? key.join('/') : String(key)).trim();

  // ---------- 2. This route only ever serves private files ----------
  // Anything else is refused, so it cannot be used to read public files or to
  // wander around the disk.
  if (!fileKey.startsWith('private/') || fileKey.includes('..')) {
    return fail('That file could not be found.', 404);
  }

  // ---------- 3. May this person see it? ----------
  if (!isAdminRole(auth.user.role)) {
    // A member may only open a receipt that belongs to a payment of their own.
    const publicAddress = `/api/files/${fileKey}`;

    if (!isDatabaseConfigured()) {
      return fail('That file could not be found.', 404);
    }

    const ownRecord = await prisma.fundPayment.count({
      where: { receiptUrl: publicAddress, memberId: auth.user.id },
    });

    if (ownRecord === 0) {
      return fail('You are not allowed to open this file.', 403);
    }
  }

  // ---------- 4. Read it and send it ----------
  const file = await readStoredFile(fileKey);
  if (!file) return fail('That file could not be found.', 404);

  return new Response(file.body as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': 'inline',
      // Stop a browser from being talked into treating the file as anything
      // other than an image it may display.
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
