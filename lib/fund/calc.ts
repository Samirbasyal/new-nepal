// ========================================
// FUND MANAGEMENT - MONEY CALCULATIONS
// ========================================
// THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR EVERY MONEY NUMBER ON THE
// WEBSITE. No page, API route or component is allowed to add up money itself.
//
// WHY THIS MATTERS
//   If the dashboard, the reports page and the member panel each did their own
//   arithmetic, they would slowly disagree with each other. One broken balance
//   destroys trust in a financial system, so every number is produced here.
//
// THE MONEY RULES (read these once, then never worry again)
//   1. Only payments with  status = "APPROVED"  count as money received.
//      Pending, rejected and cancelled payments count for nothing.
//   2. Only expenses with  status = "APPROVED"  count as money spent.
//   3. Available balance = approved collections - approved expenses.
//   4. Outstanding (pending) payments are NEVER added to the balance.
//   5. Amounts are whole numbers in the currency's main unit
//      (for example Nepali rupees). This matches the existing "donations"
//      table and avoids decimal rounding errors.
//   6. Deleted rows are ignored everywhere (soft delete keeps the audit trail).
// ========================================

import { prisma, isDatabaseConfigured } from '@/lib/prisma';

// ========================================
// SMALL DATE HELPERS
// ========================================
// Dates are handled in the server's local time zone. Months always start on
// the 1st day at midnight, which is what makes "October 2026" a single value.

/** Midnight at the start of the given day. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** The very last moment of the given day (23:59:59.999). */
export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * The first moment of the month that contains the given date.
 * Example: 18 Oct 2026 -> 01 Oct 2026 00:00
 */
export function monthStart(date: Date): Date {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Move a month forward (or backward with a negative number). */
export function addMonths(date: Date, months: number): Date {
  const copy = monthStart(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

/** "2026-10" - a short key that is safe to compare and sort. */
export function monthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

/** "October 2026" - what people actually read. */
export function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** "Oct 26" - short label for chart axes. */
export function monthShortLabel(date: Date): string {
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${month} ${String(date.getFullYear()).slice(2)}`;
}

// ========================================
// DATE RANGE FILTER (Today / Week / Month / Year / Custom)
// ========================================
export type RangePreset = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export type DateRange = {
  from: Date | null;
  to: Date | null;
  preset: RangePreset;
  label: string;
};

/**
 * Turn a preset name (and optional custom dates) into real dates.
 * The dashboard, the reports page and the export all use this, so the numbers
 * can never disagree about which days are included.
 */
export function resolveDateRange(
  preset?: string | null,
  fromParam?: string | null,
  toParam?: string | null,
): DateRange {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now), preset: 'today', label: 'Today' };

    case 'week': {
      // The week starts on Sunday.
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay());
      return { from: start, to: endOfDay(now), preset: 'week', label: 'This week' };
    }

    case 'month':
      return {
        from: monthStart(now),
        to: endOfDay(now),
        preset: 'month',
        label: 'This month',
      };

    case 'year':
      return {
        from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        to: endOfDay(now),
        preset: 'year',
        label: 'This year',
      };

    case 'custom': {
      const from = fromParam ? new Date(fromParam) : null;
      const to = toParam ? new Date(toParam) : null;
      const safeFrom = from && !Number.isNaN(from.getTime()) ? startOfDay(from) : null;
      const safeTo = to && !Number.isNaN(to.getTime()) ? endOfDay(to) : null;

      return {
        from: safeFrom,
        to: safeTo,
        preset: 'custom',
        label:
          safeFrom && safeTo
            ? `${safeFrom.toLocaleDateString('en-GB')} to ${safeTo.toLocaleDateString('en-GB')}`
            : 'Custom range',
      };
    }

    default:
      // No filter at all -> every record ever saved.
      return { from: null, to: null, preset: 'all', label: 'All time' };
  }
}

/** Build a Prisma "between these dates" filter from a DateRange. */
function dateWhere(field: string, range: DateRange): Record<string, unknown> {
  if (!range.from && !range.to) return {};

  const condition: Record<string, Date> = {};
  if (range.from) condition.gte = range.from;
  if (range.to) condition.lte = range.to;

  return { [field]: condition };
}

// ========================================
// MONEY FORMATTING
// ========================================
/** 125000 -> "Rs. 1,25,000" (Nepali digit grouping). */
export function formatMoney(amount: number, currency = 'NPR'): string {
  const symbol = currency === 'NPR' ? 'Rs.' : currency;
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${symbol} ${safe.toLocaleString('en-IN')}`;
}

// ========================================
// THE DASHBOARD SUMMARY
// ========================================
export type FundSummary = {
  // Values for the SELECTED date range (used by the period cards).
  collection: number;
  expense: number;
  balance: number;
  // Always true, all-time values (the real balance of the organization).
  allTimeCollection: number;
  allTimeExpense: number;
  allTimeBalance: number;
  // Money that is promised but not yet confirmed.
  pendingAmount: number;
  pendingCount: number;
  expectedFund: number;
  // Current calendar month.
  monthCollection: number;
  monthExpense: number;
  // How many members have paid / still owe money this month.
  membersPaid: number;
  membersPending: number;
  currency: string;
};

const EMPTY_SUMMARY: FundSummary = {
  collection: 0,
  expense: 0,
  balance: 0,
  allTimeCollection: 0,
  allTimeExpense: 0,
  allTimeBalance: 0,
  pendingAmount: 0,
  pendingCount: 0,
  expectedFund: 0,
  monthCollection: 0,
  monthExpense: 0,
  membersPaid: 0,
  membersPending: 0,
  currency: 'NPR',
};

/**
 * ONE database round of counting produces every number on the fund dashboard.
 * If the database is not set up yet we return zeros instead of crashing, so the
 * page still renders while the organization is installing the project.
 */
export async function getFundSummary(range: DateRange): Promise<FundSummary> {
  if (!isDatabaseConfigured()) return EMPTY_SUMMARY;

  try {
    const now = new Date();
    const thisMonthFrom = monthStart(now);
    const thisMonthTo = endOfDay(now);

    const notDeleted = { isDeleted: false };

    const [
      rangeCollection,
      rangeExpense,
      allCollection,
      allExpense,
      pendingPayments,
      expectedRows,
      monthCollection,
      monthExpense,
      paidThisMonth,
      pendingThisMonth,
    ] = await Promise.all([
      // ---- Money received inside the selected range ----
      prisma.fundPayment.aggregate({
        _sum: { amount: true },
        where: { ...notDeleted, status: 'APPROVED', ...dateWhere('paymentDate', range) },
      }),
      // ---- Money spent inside the selected range ----
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { ...notDeleted, status: 'APPROVED', ...dateWhere('expenseDate', range) },
      }),
      // ---- Money received, ever (the true balance uses this) ----
      prisma.fundPayment.aggregate({
        _sum: { amount: true },
        where: { ...notDeleted, status: 'APPROVED' },
      }),
      // ---- Money spent, ever ----
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { ...notDeleted, status: 'APPROVED' },
      }),
      // ---- Waiting for verification (never part of the balance) ----
      prisma.fundPayment.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: { ...notDeleted, status: 'PENDING' },
      }),
      // ---- Promised but unpaid months (outstanding contributions) ----
      prisma.monthlyContribution.findMany({
        where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        select: { requiredAmount: true, paidAmount: true },
      }),
      // ---- Current calendar month ----
      prisma.fundPayment.aggregate({
        _sum: { amount: true },
        where: {
          ...notDeleted,
          status: 'APPROVED',
          paymentDate: { gte: thisMonthFrom, lte: thisMonthTo },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          ...notDeleted,
          status: 'APPROVED',
          expenseDate: { gte: thisMonthFrom, lte: thisMonthTo },
        },
      }),
      // ---- Members who already paid this month ----
      prisma.fundPayment.findMany({
        where: {
          ...notDeleted,
          status: 'APPROVED',
          paymentDate: { gte: thisMonthFrom, lte: thisMonthTo },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
      // ---- Members who still owe money this month ----
      prisma.monthlyContribution.findMany({
        where: { periodMonth: thisMonthFrom, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        select: { id: true },
      }),
    ]);

    const collection = rangeCollection._sum.amount ?? 0;
    const expense = rangeExpense._sum.amount ?? 0;
    const allTimeCollection = allCollection._sum.amount ?? 0;
    const allTimeExpense = allExpense._sum.amount ?? 0;

    // "Expected fund" = the part of every open month that is still unpaid.
    const expectedFund = expectedRows.reduce(
      (total, row) => total + Math.max(0, row.requiredAmount - row.paidAmount),
      0,
    );

    return {
      collection,
      expense,
      balance: collection - expense,
      allTimeCollection,
      allTimeExpense,
      allTimeBalance: allTimeCollection - allTimeExpense,
      pendingAmount: pendingPayments._sum.amount ?? 0,
      pendingCount: pendingPayments._count._all ?? 0,
      expectedFund,
      monthCollection: monthCollection._sum.amount ?? 0,
      monthExpense: monthExpense._sum.amount ?? 0,
      membersPaid: paidThisMonth.length,
      membersPending: pendingThisMonth.length,
      currency: 'NPR',
    };
  } catch (error) {
    console.error('[fund] could not build the summary:', error);
    return EMPTY_SUMMARY;
  }
}

// ========================================
// MONTH-BY-MONTH SERIES (for the charts)
// ========================================
export type MonthlyPoint = {
  key: string; // "2026-10"
  label: string; // "Oct 26"
  fullLabel: string; // "October 2026"
  collection: number;
  expense: number;
  balance: number; // collection - expense for that month
  runningBalance: number; // balance carried forward month after month
};

/**
 * Collection, expense and the running balance for every month in the range.
 *
 * WHY WE FETCH ROWS INSTEAD OF USING SQL GROUP BY
 *   Prisma cannot group by "month" in a way that works on both PostgreSQL and
 *   SQLite. We therefore read only the two columns we need (amount + date) and
 *   add them up here. For a community organization this is a small number of
 *   rows, and the code stays portable and easy to read.
 */
export async function getMonthlySeries(range: DateRange): Promise<MonthlyPoint[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const [payments, expenses] = await Promise.all([
      prisma.fundPayment.findMany({
        where: { isDeleted: false, status: 'APPROVED', ...dateWhere('paymentDate', range) },
        select: { amount: true, paymentDate: true },
      }),
      prisma.expense.findMany({
        where: { isDeleted: false, status: 'APPROVED', ...dateWhere('expenseDate', range) },
        select: { amount: true, expenseDate: true },
      }),
    ]);

    // Collect every month that appears in either list.
    const buckets = new Map<string, MonthlyPoint>();

    const touch = (date: Date): MonthlyPoint => {
      const key = monthKey(date);
      let bucket = buckets.get(key);

      if (!bucket) {
        bucket = {
          key,
          label: monthShortLabel(monthStart(date)),
          fullLabel: monthLabel(monthStart(date)),
          collection: 0,
          expense: 0,
          balance: 0,
          runningBalance: 0,
        };
        buckets.set(key, bucket);
      }

      return bucket;
    };

    for (const payment of payments) touch(payment.paymentDate).collection += payment.amount;
    for (const expense of expenses) touch(expense.expenseDate).expense += expense.amount;

    // Oldest month first, so the chart reads left to right.
    const series = [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));

    // The months before the range still affect the starting balance, so we add
    // an opening figure to the first month of the series.
    const openingCollection = range.from
      ? ((
          await prisma.fundPayment.aggregate({
            _sum: { amount: true },
            where: { isDeleted: false, status: 'APPROVED', paymentDate: { lt: range.from } },
          })
        )._sum.amount ?? 0) -
        ((
          await prisma.expense.aggregate({
            _sum: { amount: true },
            where: { isDeleted: false, status: 'APPROVED', expenseDate: { lt: range.from } },
          })
        )._sum.amount ?? 0)
      : 0;

    let running = openingCollection;
    for (const point of series) {
      point.balance = point.collection - point.expense;
      running += point.balance;
      point.runningBalance = running;
    }

    return series;
  } catch (error) {
    console.error('[fund] could not build the monthly series:', error);
    return [];
  }
}

// ========================================
// PAYMENT STATUS DISTRIBUTION (for the donut chart)
// ========================================
export type StatusSlice = { status: string; count: number; amount: number };

export async function getPaymentStatusDistribution(range: DateRange): Promise<StatusSlice[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await prisma.fundPayment.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
      where: { isDeleted: false, ...dateWhere('paymentDate', range) },
    });

    return rows.map((row) => ({
      status: row.status,
      count: row._count._all,
      amount: row._sum.amount ?? 0,
    }));
  } catch (error) {
    console.error('[fund] could not build the status distribution:', error);
    return [];
  }
}

// ========================================
// SMALL BREAKDOWNS USED BY THE REPORTS PAGE
// ========================================
export type Breakdown = { name: string; count: number; amount: number };

/** How much came in through each bank. */
export async function getBankWiseCollection(range: DateRange): Promise<Breakdown[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await prisma.fundPayment.findMany({
      where: { isDeleted: false, status: 'APPROVED', ...dateWhere('paymentDate', range) },
      select: { amount: true, bankNameSnapshot: true, bank: { select: { name: true } } },
    });

    const buckets = new Map<string, Breakdown>();

    for (const row of rows) {
      // The snapshot keeps the historical name even if the bank was renamed.
      const name = row.bankNameSnapshot || row.bank?.name || 'Bank not recorded';
      const bucket = buckets.get(name) ?? { name, count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount += row.amount;
      buckets.set(name, bucket);
    }

    return [...buckets.values()].sort((a, b) => b.amount - a.amount);
  } catch (error) {
    console.error('[fund] could not build the bank breakdown:', error);
    return [];
  }
}

/** How much was spent in each expense category. */
export async function getExpenseCategoryBreakdown(range: DateRange): Promise<Breakdown[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await prisma.expense.findMany({
      where: { isDeleted: false, status: 'APPROVED', ...dateWhere('expenseDate', range) },
      select: { amount: true, category: { select: { name: true } } },
    });

    const buckets = new Map<string, Breakdown>();

    for (const row of rows) {
      const name = row.category?.name ?? 'Uncategorised';
      const bucket = buckets.get(name) ?? { name, count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount += row.amount;
      buckets.set(name, bucket);
    }

    return [...buckets.values()].sort((a, b) => b.amount - a.amount);
  } catch (error) {
    console.error('[fund] could not build the category breakdown:', error);
    return [];
  }
}

// ========================================
// MONTHLY CONTRIBUTIONS
// ========================================
/** Decide the status of a month from what was required and what was paid. */
export function contributionStatusFor(
  requiredAmount: number,
  paidAmount: number,
  dueDate: Date,
  currentStatus?: string,
): string {
  // A waived month always stays waived, whatever else happens.
  if (currentStatus === 'WAIVED') return 'WAIVED';
  if (paidAmount >= requiredAmount && requiredAmount > 0) return 'PAID';
  if (paidAmount > 0) return 'PARTIAL';
  return Date.now() > dueDate.getTime() ? 'OVERDUE' : 'PENDING';
}

/**
 * Recalculate one member's month from their APPROVED payments.
 * This is called after a payment is approved, rejected or cancelled, so the
 * monthly tracking table can never drift away from the payment records.
 */
export async function recalculateContribution(
  memberId: string,
  periodMonth: Date,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const month = monthStart(periodMonth);

  const contribution = await prisma.monthlyContribution.findUnique({
    where: { memberId_periodMonth: { memberId, periodMonth: month } },
  });

  // No obligation exists for this month, so there is nothing to recalculate.
  if (!contribution) return;

  const paid = await prisma.fundPayment.aggregate({
    _sum: { amount: true },
    where: {
      memberId,
      periodMonth: month,
      status: 'APPROVED',
      isDeleted: false,
    },
  });

  const paidAmount = paid._sum.amount ?? 0;

  // The money for a month is due on the DUE DAY OF THAT SAME MONTH
  // (the 15th by default - Admin Panel -> Settings -> Monthly fund).
  const dueDate = contributionDueDate(month, await fundDueDay());

  await prisma.monthlyContribution.update({
    where: { id: contribution.id },
    data: {
      paidAmount,
      status: contributionStatusFor(
        contribution.requiredAmount,
        paidAmount,
        dueDate,
        contribution.status,
      ),
    },
  });
}

/**
 * Make sure a monthly obligation row exists for this member and month.
 * Safe to call many times - it never creates a duplicate.
 */
export async function ensureContribution(
  memberId: string,
  periodMonth: Date,
  requiredAmount: number,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const month = monthStart(periodMonth);

  await prisma.monthlyContribution.upsert({
    where: { memberId_periodMonth: { memberId, periodMonth: month } },
    create: { memberId, periodMonth: month, requiredAmount, paidAmount: 0, status: 'PENDING' },
    // The required amount may change; the paid amount is never touched here.
    update: { requiredAmount },
  });
}

// ========================================
// THE DUE DAY (the 15th of every month)
// ========================================
/**
 * Read the due day straight from the settings table.
 *
 * Why here and not in lib/settings.ts: this file must stay usable from
 * scripts, API routes and pages, and it must never grow a dependency on the
 * React cache. One small row read is cheap, and the value is clamped to a real
 * calendar day (1-28) so February can never break it.
 */
export async function fundDueDay(): Promise<number> {
  if (!isDatabaseConfigured()) return 15;

  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'fund.dueDay' } });
    const value = Number(row?.value ?? '15');
    if (!Number.isFinite(value)) return 15;
    return Math.min(Math.max(Math.trunc(value), 1), 28);
  } catch {
    return 15;
  }
}

/**
 * When is the contribution for this month due?
 *
 * The contribution for October 2026 is due on 15 October 2026 - the 15th of the
 * SAME month. (It is NOT the 15th of the following month: "due every month on
 * the 15th" is what the members were told.)
 */
export function contributionDueDate(periodMonth: Date, dueDay = 15): Date {
  const due = monthStart(periodMonth);
  due.setDate(Math.min(Math.max(dueDay, 1), 28));
  return due;
}

// ========================================
// AUTOMATIC MONTHLY CONTRIBUTIONS
// ========================================
/**
 * Create this month's Rs. 20 obligation for EVERY active member.
 *
 * WHY THIS EXISTS
 *   The office should never have to remember to "open" a month. This function is
 *   called when the member opens their Monthly fund page and when an
 *   administrator opens the monthly tracking screen, so the rows appear by
 *   themselves on the first visit of the month.
 *
 * IT IS SAFE TO RUN MANY TIMES
 *   One row per member per month is guaranteed by the database
 *   (@@unique([memberId, periodMonth])), and existing rows are left alone. A
 *   month that is already paid is never reset.
 *
 * WHO COUNTS AS A MEMBER
 *   role = MEMBER, the login is switched on, and the membership status is
 *   ACTIVE. A suspended or inactive member is not asked for money, and neither
 *   is an administrator.
 *
 * Returns how many rows were newly created (0 means "already done").
 */
export async function ensureContributionsForMonth(
  periodMonth: Date,
  requiredAmount: number,
): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  const month = monthStart(periodMonth);
  const dueDate = contributionDueDate(month, await fundDueDay());

  try {
    const members = await prisma.user.findMany({
      where: {
        role: 'MEMBER',
        isActive: true,
        profile: { is: { status: 'ACTIVE' } },
      },
      select: { id: true },
    });

    let created = 0;

    for (const member of members) {
      const existing = await prisma.monthlyContribution.findUnique({
        where: { memberId_periodMonth: { memberId: member.id, periodMonth: month } },
        select: { id: true },
      });

      if (existing) continue;

      await prisma.monthlyContribution.create({
        data: {
          memberId: member.id,
          periodMonth: month,
          requiredAmount,
          paidAmount: 0,
          status: contributionStatusFor(requiredAmount, 0, dueDate),
        },
      });

      created += 1;
    }

    return created;
  } catch (error) {
    // Never break a page because the month could not be opened: the member can
    // still pay, and the office sees the row the moment the problem is fixed.
    console.error('[fund] could not open the monthly contributions:', error);
    return 0;
  }
}
