// ========================================
// API - MONTHLY CONTRIBUTIONS (LIST + CREATE THE MONTH)
// ========================================
// Address: GET  /api/admin/fund/contributions?month=2026-10
//          POST /api/admin/fund/contributions   { action: 'generate', ... }
//
// WHAT "GENERATE" DOES
//   Creates one row per active member for the chosen month:
//       Member A | Oct 2026 | required 1000 | paid 0 | PENDING
//   It never creates a duplicate: the database has a unique rule on
//   (member, month) and the code uses an "upsert" (update or insert).
//
// The required amount comes from Admin Panel -> Settings -> "fund.monthlyAmount"
// unless a different amount is typed for this run.
// ========================================

import { fail, ok, readJson, zodFieldErrors } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { contributionGenerateSchema } from '@/lib/fund/schemas';
import { monthKey, monthStart } from '@/lib/fund/calc';
import { readSettingValue } from '@/lib/settings';
import { clientIp, writeFundAudit, notify } from '@/lib/fund/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return ok({ rows: [], summary: null });

  const url = new URL(request.url);
  const monthParam = url.searchParams.get('month');

  // Default to the current month when none was chosen.
  const month = monthParam ? monthStart(new Date(`${monthParam}-01`)) : monthStart(new Date());

  const [rows, monthlyAmountText] = await Promise.all([
    prisma.monthlyContribution.findMany({
      where: { periodMonth: month },
      orderBy: [{ status: 'asc' }, { member: { name: 'asc' } }],
      include: {
        member: { select: { id: true, name: true, email: true, isActive: true } },
      },
    }),
    // The monthly member fund is Rs. 20 by default. This fallback must match
    // lib/settings.ts and the pages, or the API would work with a different
    // amount than the screen when the setting has never been saved.
    readSettingValue('fund.monthlyAmount', '20'),
  ]);

  const summary = {
    month: monthKey(month),
    required: rows.reduce((total, row) => total + row.requiredAmount, 0),
    collected: rows.reduce((total, row) => total + row.paidAmount, 0),
    paidCount: rows.filter((row) => row.status === 'PAID').length,
    pendingCount: rows.filter((row) => row.status === 'PENDING').length,
    partialCount: rows.filter((row) => row.status === 'PARTIAL').length,
    overdueCount: rows.filter((row) => row.status === 'OVERDUE').length,
    waivedCount: rows.filter((row) => row.status === 'WAIVED').length,
    defaultAmount: Number(monthlyAmountText) || 20,
  };

  return ok({ rows, summary });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) {
    return fail('The database is not set up yet.', 503);
  }

  const body = await readJson(request);
  const parsed = contributionGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return fail('Please check the form and try again.', 422, zodFieldErrors(parsed.error));
  }

  const { periodMonth, requiredAmount, includeExisting } = parsed.data;

  const amountFromSettings = Number(await readSettingValue('fund.monthlyAmount', '20')) || 20;
  const amount = requiredAmount ?? amountFromSettings;

  // Every ACTIVE MEMBER should have a row for the month.
  //
  // Administrators are left out on purpose: the monthly contribution is an
  // obligation of members, and an administrator's own account must never appear
  // in the tracking table as somebody who owes money. This is the same rule as
  // ensureContributionsForMonth() in lib/fund/calc.ts, so the automatic opening
  // of a month and this manual button behave identically.
  const members = await prisma.user.findMany({
    where: {
      role: 'MEMBER',
      isActive: true,
      profile: { is: { status: 'ACTIVE' } },
    },
    select: { id: true, name: true },
  });

  const existing = await prisma.monthlyContribution.findMany({
    where: { periodMonth, memberId: { in: members.map((m) => m.id) } },
    select: { memberId: true },
  });

  const alreadyHaveRow = new Set(existing.map((row) => row.memberId));

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const member of members) {
    if (alreadyHaveRow.has(member.id)) {
      // Never overwrite a month that already exists unless asked to, because
      // it may already contain payments.
      if (!includeExisting) {
        skipped += 1;
        continue;
      }

      await prisma.monthlyContribution.update({
        where: { memberId_periodMonth: { memberId: member.id, periodMonth } },
        data: { requiredAmount: amount },
      });
      updated += 1;
      continue;
    }

    await prisma.monthlyContribution.create({
      data: { memberId: member.id, periodMonth, requiredAmount: amount, status: 'PENDING' },
    });
    created += 1;
  }

  // Tell members who now owe money for the month.
  if (created > 0) {
    for (const member of members.filter((m) => !alreadyHaveRow.has(m.id))) {
      await notify(member.id, {
        title: 'Monthly fund is due',
        message: `Your contribution of NRs ${amount.toLocaleString('en-IN')} for ${monthKey(
          periodMonth,
        )} has been added. Please pay and submit the details.`,
        type: 'INFO',
        link: '/member/fund',
      });
    }
  }

  await writeFundAudit({
    actor: auth.user,
    action: 'CREATE',
    entity: 'MonthlyContribution',
    entityId: monthKey(periodMonth),
    detail: `Generated the monthly fund for ${monthKey(periodMonth)} (${created} new, ${updated} updated, ${skipped} already existed).`,
    newValue: { periodMonth: monthKey(periodMonth), amount, created, updated, skipped },
    ipAddress: clientIp(request),
  });

  return ok(
    { created, updated, skipped, amount, month: monthKey(periodMonth) },
    201,
    `${created} member(s) added, ${updated} updated, ${skipped} already had this month.`,
  );
}
