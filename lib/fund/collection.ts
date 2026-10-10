// ========================================
// MONTHLY COLLECTION / CONTRIBUTION ACCOUNTING
// ========================================
// Every number on the Super Admin "Monthly collection accounting" screen comes
// from this file, and every one of them is worked out from real rows.
//
// THE ONE RULE, REPEATED EVERYWHERE IN THIS PROJECT
//   A payment counts as MONEY RECEIVED only when it is APPROVED.
//   Pending payments are shown separately (they are somebody's word, not money),
//   and rejected payments are never counted as received at all.
//
// EXPECTED vs COLLECTED vs REMAINING
//   expected  = what the active members owe for that month
//               (the sum of the month's contribution rows, which is
//                active members x the monthly amount - see lib/fund/calc.ts)
//   collected = approved payments for that month
//   remaining = expected - collected   (never below zero)
//
// This file does NOT touch loans. Loan money is a different kind of money and
// lives in lib/loan/calc.ts.
// ========================================

import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { addMonths, monthLabel, monthStart, startOfDay, endOfDay } from '@/lib/fund/calc';

// ========================================
// A MONTH RANGE HELPER
// ========================================
/** The first and last moment of a month. */
function monthBounds(periodMonth: Date): { from: Date; to: Date } {
  const from = monthStart(periodMonth);
  const to = endOfDay(new Date(from.getFullYear(), from.getMonth() + 1, 0));
  return { from, to };
}

// ========================================
// THE ACCOUNTING OVERVIEW (the cards on the screen)
// ========================================
export type CollectionOverview = {
  /** ---- members ---- */
  registeredMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  membersPaid: number;
  membersNotPaid: number;
  membersPartlyPaid: number;

  /** ---- the month being looked at ---- */
  monthLabel: string;
  monthlyAmount: number;
  expectedThisMonth: number;
  collectedThisMonth: number;
  pendingThisMonth: number;
  rejectedThisMonth: number;
  remainingThisMonth: number;
  /** How many payments (of any status) were submitted this month. */
  submissionsThisMonth: number;

  /** ---- previous month, for comparison ---- */
  previousMonthLabel: string;
  collectedPreviousMonth: number;
  expectedPreviousMonth: number;

  /** ---- all time ---- */
  collectedOverall: number;
  expectedOverall: number;
  /** Approved payments ever received. */
  approvedPaymentsOverall: number;
};

/**
 * Everything the accounting screen shows, for one month.
 *
 * `monthlyAmount` comes from the settings (Rs. 20 by default) and is used for
 * display and for working out "expected" when a month has no rows yet.
 */
export async function getCollectionOverview(
  periodMonth: Date,
  monthlyAmount: number,
): Promise<CollectionOverview> {
  const month = monthStart(periodMonth);
  const previous = monthStart(addMonths(month, -1));
  const previousBounds = monthBounds(previous);

  const empty: CollectionOverview = {
    registeredMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    membersPaid: 0,
    membersNotPaid: 0,
    membersPartlyPaid: 0,
    monthLabel: monthLabel(month),
    monthlyAmount,
    expectedThisMonth: 0,
    collectedThisMonth: 0,
    pendingThisMonth: 0,
    rejectedThisMonth: 0,
    remainingThisMonth: 0,
    submissionsThisMonth: 0,
    previousMonthLabel: monthLabel(previous),
    collectedPreviousMonth: 0,
    expectedPreviousMonth: 0,
    collectedOverall: 0,
    expectedOverall: 0,
    approvedPaymentsOverall: 0,
  };

  if (!isDatabaseConfigured()) return empty;

  try {
    // ---------- 1. Members ----------
    const [registeredMembers, activeMembers] = await Promise.all([
      prisma.user.count({ where: { role: 'MEMBER' } }),
      prisma.user.count({
        where: { role: 'MEMBER', isActive: true, profile: { is: { status: 'ACTIVE' } } },
      }),
    ]);

    // ---------- 2. This month's contribution rows ----------
    const rows = await prisma.monthlyContribution.findMany({
      where: { periodMonth: month, member: { role: 'MEMBER' } },
      select: { status: true, requiredAmount: true, paidAmount: true },
    });

    let expectedThisMonth = 0;
    let membersPaid = 0;
    let membersNotPaid = 0;
    let membersPartlyPaid = 0;

    for (const row of rows) {
      expectedThisMonth += Math.max(0, Math.round(row.requiredAmount));

      if (row.status === 'PAID' || row.status === 'WAIVED') membersPaid += 1;
      else if (row.paidAmount > 0) membersPartlyPaid += 1;
      else membersNotPaid += 1;
    }

    // A member who joined after the rows were opened has no row yet, so the
    // expected figure is topped up from the member count. This keeps "expected"
    // equal to active members x the monthly amount, which is what the members
    // were told.
    const expectedFromMembers = activeMembers * monthlyAmount;
    if (rows.length === 0 && expectedFromMembers > 0) {
      expectedThisMonth = expectedFromMembers;
      membersNotPaid = activeMembers;
    }

    // ---------- 3. Payments of this month ----------
    const paymentsThisMonth = await prisma.fundPayment.findMany({
      where: { isDeleted: false, periodMonth: month },
      select: { amount: true, status: true },
    });

    let collectedThisMonth = 0;
    let pendingThisMonth = 0;
    let rejectedThisMonth = 0;

    for (const payment of paymentsThisMonth) {
      const amount = Math.max(0, Math.round(payment.amount));

      if (payment.status === 'APPROVED') collectedThisMonth += amount;
      else if (payment.status === 'PENDING' || payment.status === 'PARTIAL') pendingThisMonth += amount;
      else if (payment.status === 'REJECTED') rejectedThisMonth += amount;
    }

    // ---------- 4. The previous month ----------
    const previousRows = await prisma.monthlyContribution.aggregate({
      _sum: { requiredAmount: true },
      where: { periodMonth: previous, member: { role: 'MEMBER' } },
    });

    const previousCollected = await prisma.fundPayment.aggregate({
      _sum: { amount: true },
      where: {
        isDeleted: false,
        status: 'APPROVED',
        paymentDate: { gte: previousBounds.from, lte: previousBounds.to },
      },
    });

    // ---------- 5. All time ----------
    const allApproved = await prisma.fundPayment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: { isDeleted: false, status: 'APPROVED' },
    });

    const allExpected = await prisma.monthlyContribution.aggregate({
      _sum: { requiredAmount: true },
      where: { member: { role: 'MEMBER' } },
    });

    return {
      registeredMembers,
      activeMembers,
      inactiveMembers: Math.max(0, registeredMembers - activeMembers),
      membersPaid,
      membersNotPaid,
      membersPartlyPaid,

      monthLabel: monthLabel(month),
      monthlyAmount,
      expectedThisMonth,
      collectedThisMonth,
      pendingThisMonth,
      rejectedThisMonth,
      remainingThisMonth: Math.max(0, expectedThisMonth - collectedThisMonth),
      submissionsThisMonth: paymentsThisMonth.length,

      previousMonthLabel: monthLabel(previous),
      collectedPreviousMonth: previousCollected._sum.amount ?? 0,
      expectedPreviousMonth: previousRows._sum.requiredAmount ?? activeMembers * monthlyAmount,

      collectedOverall: allApproved._sum.amount ?? 0,
      expectedOverall: allExpected._sum.requiredAmount ?? 0,
      approvedPaymentsOverall: allApproved._count._all ?? 0,
    };
  } catch (error) {
    console.error('[collection] could not work out the collection overview:', error);
    return empty;
  }
}

// ========================================
// THE MONTH-BY-MONTH SERIES (a bar chart and a table)
// ========================================
export type MonthPoint = {
  key: string;
  label: string;
  expected: number;
  collected: number;
  remaining: number;
};

/**
 * The last `months` months, oldest first.
 *
 * Used for the chart on the accounting screen AND for the collection history,
 * so the graph and the table can never disagree.
 */
export async function getCollectionSeries(months = 12, monthlyAmount = 20): Promise<MonthPoint[]> {
  if (!isDatabaseConfigured()) return [];

  const thisMonth = monthStart(new Date());
  const start = monthStart(addMonths(thisMonth, -(months - 1)));

  try {
    const [rows, payments] = await Promise.all([
      prisma.monthlyContribution.findMany({
        where: { periodMonth: { gte: start }, member: { role: 'MEMBER' } },
        select: { periodMonth: true, requiredAmount: true },
      }),
      prisma.fundPayment.findMany({
        where: {
          isDeleted: false,
          status: 'APPROVED',
          paymentDate: { gte: start, lte: endOfDay(new Date()) },
        },
        select: { paymentDate: true, amount: true },
      }),
    ]);

    const series: MonthPoint[] = [];

    for (let index = 0; index < months; index += 1) {
      const month = monthStart(addMonths(start, index));
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      const bounds = monthBounds(month);

      const expected = rows
        .filter((row) => startOfDay(row.periodMonth).getTime() === month.getTime())
        .reduce((total, row) => total + Math.max(0, Math.round(row.requiredAmount)), 0);

      const collected = payments
        .filter((payment) => {
          const date = new Date(payment.paymentDate ?? 0);
          return date.getTime() >= bounds.from.getTime() && date.getTime() <= bounds.to.getTime();
        })
        .reduce((total, payment) => total + Math.max(0, Math.round(payment.amount)), 0);

      series.push({
        key,
        label: monthLabel(month),
        expected,
        collected,
        remaining: Math.max(0, expected - collected),
      });
    }

    return series;
  } catch (error) {
    console.error('[collection] could not build the monthly series:', error);
    return [];
  }
}

// ========================================
// THE MEMBER-WISE CONTRIBUTION REPORT
// ========================================
export type MemberContributionRow = {
  memberId: string;
  memberName: string;
  memberCode: string | null;
  email: string;
  phone: string | null;
  district: string | null;
  memberStatus: string;

  monthKey: string;
  monthLabel: string;

  requiredAmount: number;
  paidAmount: number;
  /** required - paid, never below zero. */
  dueAmount: number;

  /** PAID / PARTIAL / PENDING / OVERDUE / WAIVED */
  status: string;
  /** When the last approved payment came in (empty when nothing has come in). */
  lastPaymentDate: Date | null;
  /** How many payments were approved for this month. */
  approvedPayments: number;
  /** How much is sitting with the office waiting to be verified. */
  pendingAmount: number;
};

export type MemberContributionFilters = {
  periodMonth?: Date | null;
  search?: string | null;
  district?: string | null;
  status?: string | null;
  take?: number;
  skip?: number;
};

/**
 * One row per member for the month being looked at (or every month when no
 * month is given).
 *
 * The search box looks in the member's name, email, phone, membership number
 * and district, so the office can find a person the way they think about them.
 */
export async function getMemberContributionRows(
  filters: MemberContributionFilters = {},
): Promise<MemberContributionRow[]> {
  if (!isDatabaseConfigured()) return [];

  const take = Math.min(Math.max(filters.take ?? 200, 1), 1000);
  const skip = Math.max(filters.skip ?? 0, 0);
  const search = (filters.search ?? '').trim();

  try {
    const rows = await prisma.monthlyContribution.findMany({
      where: {
        ...(filters.periodMonth ? { periodMonth: monthStart(filters.periodMonth) } : {}),
        ...(filters.status ? { status: filters.status.toUpperCase() } : {}),
        member: {
          role: 'MEMBER',
          ...(filters.district ? { profile: { is: { district: filters.district } } } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search } },
                  { email: { contains: search } },
                  { phone: { contains: search } },
                  {
                    profile: {
                      is: {
                        OR: [
                          { membershipNo: { contains: search } },
                          { district: { contains: search } },
                        ],
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profile: { select: { membershipNo: true, district: true, status: true } },
          },
        },
      },
      orderBy: [{ periodMonth: 'desc' }, { member: { name: 'asc' } }],
      take,
      skip,
    });

    if (rows.length === 0) return [];

    // One query for all the payments of the months involved, then match them in
    // memory. This keeps the report fast even with many members.
    const months = [...new Set(rows.map((row) => row.periodMonth.getTime()))].map(
      (time) => new Date(time),
    );

    const payments = await prisma.fundPayment.findMany({
      where: {
        isDeleted: false,
        periodMonth: { in: months },
        memberId: { in: rows.map((row) => row.memberId) },
      },
      select: { memberId: true, periodMonth: true, amount: true, status: true, paymentDate: true },
      orderBy: { paymentDate: 'asc' },
    });

    return rows.map((row) => {
      const member = row.member;
      const monthTime = row.periodMonth.getTime();

      const own = payments.filter(
        (payment) => payment.memberId === row.memberId && payment.periodMonth?.getTime() === monthTime,
      );

      const approved = own.filter((payment) => payment.status === 'APPROVED');
      const pending = own.filter(
        (payment) => payment.status === 'PENDING' || payment.status === 'PARTIAL',
      );

      const requiredAmount = Math.max(0, Math.round(row.requiredAmount));
      const paidAmount = approved.reduce((total, payment) => total + Math.round(payment.amount), 0);
      const lastPayment = approved.length ? approved[approved.length - 1].paymentDate : null;

      return {
        memberId: row.memberId,
        memberName: member?.name ?? 'Unknown',
        memberCode: member?.profile?.membershipNo ?? null,
        email: member?.email ?? '',
        phone: member?.phone ?? null,
        district: member?.profile?.district ?? null,
        memberStatus: member?.profile?.status ?? 'ACTIVE',

        monthKey: `${row.periodMonth.getFullYear()}-${String(row.periodMonth.getMonth() + 1).padStart(2, '0')}`,
        monthLabel: monthLabel(row.periodMonth),

        requiredAmount,
        paidAmount,
        dueAmount: Math.max(0, requiredAmount - paidAmount),

        status: row.status,
        lastPaymentDate: lastPayment ? new Date(lastPayment) : null,
        approvedPayments: approved.length,
        pendingAmount: pending.reduce((total, payment) => total + Math.round(payment.amount), 0),
      };
    });
  } catch (error) {
    console.error('[collection] could not build the member contribution report:', error);
    return [];
  }
}

// ========================================
// HOW MANY ROWS ARE THERE IN TOTAL? (for paging)
// ========================================
export async function countMemberContributionRows(
  filters: MemberContributionFilters = {},
): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  const search = (filters.search ?? '').trim();

  try {
    return await prisma.monthlyContribution.count({
      where: {
        ...(filters.periodMonth ? { periodMonth: monthStart(filters.periodMonth) } : {}),
        ...(filters.status ? { status: filters.status.toUpperCase() } : {}),
        member: {
          role: 'MEMBER',
          ...(filters.district ? { profile: { is: { district: filters.district } } } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search } },
                  { email: { contains: search } },
                  {
                    profile: {
                      is: {
                        OR: [
                          { membershipNo: { contains: search } },
                          { district: { contains: search } },
                        ],
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      },
    });
  } catch {
    return 0;
  }
}
