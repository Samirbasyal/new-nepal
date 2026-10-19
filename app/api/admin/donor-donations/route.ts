// ========================================
// API - RECORD A DONATION FOR A SUPPORTER
// ========================================
// Address: POST /api/admin/donor-donations
// Body:    { donorId, amount, purpose?, method?, reference?, note? }
//
// WHY THIS EXISTS
//   The Donors & Supporters page holds a PROFILE (who the person is). The money
//   they gave lives in `donations`, one row per gift. This endpoint creates the
//   transaction, so a supporter can give ten times and nothing is overwritten.
//
// RULES
//   - The donation always starts as PENDING. Only a verification decision turns
//     it into confirmed money (that is the existing, separate workflow).
//   - The amount is an integer in NPR, validated on the server.
//   - The donor's name is copied onto the transaction, so the record still reads
//     correctly if the profile is renamed later.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { notifyAdmins } from '@/lib/notifications';
import { formatMoney } from '@/lib/fund/calc';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return fail('The database is not set up yet.', 503);

  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const body = (await readJson(request)) as
    | {
        donorId?: string;
        amount?: number | string;
        purpose?: string;
        method?: string;
        reference?: string;
        note?: string;
      }
    | null;

  const donorId = String(body?.donorId ?? '').trim();
  const amount = Math.round(Number(body?.amount ?? 0));

  if (!donorId) return fail('Please choose a supporter.', 422);

  if (!Number.isFinite(amount) || amount < 1) {
    return fail('Please enter the amount that was given.', 422, {
      amount: 'Enter an amount of at least NPR 1.',
    });
  }

  if (amount > 100_000_000) {
    return fail('That amount is too large. Please check it and try again.', 422, {
      amount: 'This amount looks wrong.',
    });
  }

  const donor = await prisma.donor.findUnique({
    where: { id: donorId },
    select: { id: true, name: true, organization: true },
  });

  if (!donor) return fail('That supporter could not be found.', 404);

  const donation = await prisma.donation.create({
    data: {
      donorName: donor.organization ? `${donor.name} (${donor.organization})` : donor.name,
      donorId: donor.id,
      amount,
      purpose: String(body?.purpose ?? '').trim() || null,
      method: String(body?.method ?? 'BANK_TRANSFER').trim() || 'BANK_TRANSFER',
      reference: String(body?.reference ?? '').trim() || null,
      note: String(body?.note ?? '').trim() || null,
      status: 'PENDING',
      recordedBy: auth.user.email,
    },
    select: { id: true, amount: true, status: true },
  });

  // The same bell the monthly payments use, so nobody has to remember to look.
  await notifyAdmins({
    title: 'New donation recorded',
    message: `${donor.name} — ${formatMoney(amount)} recorded by ${auth.user.name}. Waiting for verification.`,
    type: 'INFO',
    link: `/admin/donations/${donation.id}`,
  });

  return ok(
    { donation },
    201,
    `${formatMoney(amount)} recorded for ${donor.name}. It is waiting for verification.`,
  );
}
