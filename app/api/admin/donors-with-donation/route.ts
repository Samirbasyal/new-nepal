// ========================================
// API - NEW SUPPORTER TOGETHER WITH A FIRST DONATION
// ========================================
// Address: POST /api/admin/donors-with-donation
// Body:    { name, organization?, supportArea?, description?, amount?, purpose? }
//
// WHY
//   Adding a supporter and typing their gift used to be two separate screens, so
//   people added the person and forgot the money - and the total stayed empty.
//   Here both are saved together, in ONE transaction: either the person and the
//   gift are both written, or nothing is.
//
// ACCOUNT
//   The profile holds who the person is; the money is a row in `donations`.
//   Nothing is stored twice, so a supporter can give again later without the
//   total being counted twice.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) {
    return fail('The database is not set up yet.', 503);
  }

  const body = (await readJson(request)) as {
    name?: string;
    organization?: string;
    supportArea?: string;
    description?: string;
    amount?: number | string;
    purpose?: string;
  } | null;

  const name = String(body?.name ?? '').trim();
  if (name.length < 2) {
    return fail('Please write the supporter name.', 422, { name: 'Please write the name.' });
  }

  const rawAmount = body?.amount;
  const amount =
    rawAmount === undefined || rawAmount === null || String(rawAmount).trim() === ''
      ? 0
      : Math.round(Number(rawAmount));

  if (!Number.isFinite(amount) || amount < 0) {
    return fail('Please enter a valid amount.', 422, { amount: 'Enter an amount of NPR 1 or more.' });
  }

  if (amount > 100_000_000) {
    return fail('That amount is too large.', 422, { amount: 'That amount is too large.' });
  }

  const donor = await prisma.$transaction(async (tx) => {
    const created = await tx.donor.create({
      data: {
        name,
        organization: String(body?.organization ?? '').trim() || null,
        supportArea: String(body?.supportArea ?? '').trim() || null,
        description: String(body?.description ?? '').trim() || null,
        isPublic: false,
        isActive: true,
        sortOrder: 0,
      },
      select: { id: true, name: true, organization: true },
    });

    if (amount > 0) {
      await tx.donation.create({
        data: {
          donorName: created.organization ? `${created.name} (${created.organization})` : created.name,
          donorId: created.id,
          amount,
          purpose: String(body?.purpose ?? '').trim() || null,
          method: 'CASH',
          status: 'VERIFIED',
          recordedBy: auth.user.email,
        },
      });
    }

    return created;
  });

  return ok({ donor, amount }, 201);
}
