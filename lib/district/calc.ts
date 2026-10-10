// ========================================
// DISTRICT WORK - ALL THE TOTALS
// ========================================
// Every number on the district screens comes from here, worked out from the
// rows in the database.
//
// ONE RULE THAT IS KEPT EVERYWHERE
//   A blank figure stays blank. If nobody recorded how many people benefited,
//   we show a dash - we never invent a number to make a report look better.
//
// The district names come from config/districts.ts (the official 77), and the
// province of each district is used to group the totals.
// ========================================

import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { DISTRICTS, provinceOf } from '@/config/districts';

export type DistrictFilters = {
  district?: string | null;
  province?: string | null;
  status?: string | null;
  activityType?: string | null;
  /** Only activities from this year (empty = every year). */
  year?: number | null;
};

export type DistrictTotals = {
  totalActivities: number;
  /** How many of the 77 districts have at least one activity. */
  districtsWithWork: number;
  totalBeneficiaries: number;
  /** How many people's benefit figures were actually recorded. */
  activitiesWithBeneficiaries: number;
  totalMembersInvolved: number;
  totalFundUsed: number;
  planned: number;
  ongoing: number;
  completed: number;
  cancelled: number;
};

const EMPTY: DistrictTotals = {
  totalActivities: 0,
  districtsWithWork: 0,
  totalBeneficiaries: 0,
  activitiesWithBeneficiaries: 0,
  totalMembersInvolved: 0,
  totalFundUsed: 0,
  planned: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
};

/** Build the "where" used by every query below. */
function buildWhere(filters: DistrictFilters) {
  const where: Record<string, unknown> = { isDeleted: false };

  if (filters.district) where.district = filters.district;
  if (filters.status) where.status = filters.status.toUpperCase();
  if (filters.activityType) where.activityType = filters.activityType;

  if (filters.year) {
    where.activityDate = {
      gte: new Date(filters.year, 0, 1),
      lte: new Date(filters.year, 11, 31, 23, 59, 59),
    };
  }

  // A province is a list of districts, so it becomes an "in" filter.
  if (filters.province) {
    const names = DISTRICTS.filter((d) => d.province === filters.province).map((d) => d.name);
    where.district = { in: names };
  }

  return where;
}

// ========================================
// THE TOTALS
// ========================================
export async function getDistrictTotals(filters: DistrictFilters = {}): Promise<DistrictTotals> {
  if (!isDatabaseConfigured()) return EMPTY;

  try {
    const rows = await prisma.districtActivity.findMany({
      where: buildWhere(filters),
      select: {
        district: true,
        status: true,
        beneficiaries: true,
        membersInvolved: true,
        amountUsed: true,
      },
    });

    const totals: DistrictTotals = { ...EMPTY };
    const districts = new Set<string>();

    for (const row of rows) {
      totals.totalActivities += 1;
      districts.add(row.district);

      if (row.beneficiaries !== null) {
        totals.totalBeneficiaries += row.beneficiaries;
        totals.activitiesWithBeneficiaries += 1;
      }
      if (row.membersInvolved !== null) totals.totalMembersInvolved += row.membersInvolved;
      if (row.amountUsed !== null) totals.totalFundUsed += row.amountUsed;

      const status = String(row.status).toUpperCase();
      if (status === 'PLANNED') totals.planned += 1;
      else if (status === 'ONGOING') totals.ongoing += 1;
      else if (status === 'COMPLETED') totals.completed += 1;
      else if (status === 'CANCELLED') totals.cancelled += 1;
    }

    totals.districtsWithWork = districts.size;
    return totals;
  } catch (error) {
    console.error('[district] could not work out the totals:', error);
    return EMPTY;
  }
}

// ========================================
// ONE LINE PER DISTRICT
// ========================================
export type DistrictLine = {
  district: string;
  province: string;
  activities: number;
  beneficiaries: number;
  membersInvolved: number;
  fundUsed: number;
  completed: number;
  ongoing: number;
  planned: number;
};

/**
 * Every district that has work recorded, busiest first.
 *
 * Districts with nothing recorded are simply absent - they are not shown as 0,
 * because "no activity recorded" and "an activity with no benefit numbers" are
 * two different things.
 */
export async function getDistrictBreakdown(filters: DistrictFilters = {}): Promise<DistrictLine[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await prisma.districtActivity.findMany({
      where: buildWhere(filters),
      select: {
        district: true,
        status: true,
        beneficiaries: true,
        membersInvolved: true,
        amountUsed: true,
      },
    });

    const map = new Map<string, DistrictLine>();

    for (const row of rows) {
      const line = map.get(row.district) ?? {
        district: row.district,
        province: provinceOf(row.district),
        activities: 0,
        beneficiaries: 0,
        membersInvolved: 0,
        fundUsed: 0,
        completed: 0,
        ongoing: 0,
        planned: 0,
      };

      line.activities += 1;
      if (row.beneficiaries !== null) line.beneficiaries += row.beneficiaries;
      if (row.membersInvolved !== null) line.membersInvolved += row.membersInvolved;
      if (row.amountUsed !== null) line.fundUsed += row.amountUsed;

      const status = String(row.status).toUpperCase();
      if (status === 'COMPLETED') line.completed += 1;
      else if (status === 'ONGOING') line.ongoing += 1;
      else if (status === 'PLANNED') line.planned += 1;

      map.set(row.district, line);
    }

    return [...map.values()].sort(
      (a, b) => b.activities - a.activities || a.district.localeCompare(b.district),
    );
  } catch (error) {
    console.error('[district] could not build the district breakdown:', error);
    return [];
  }
}

// ========================================
// ONE LINE PER PROVINCE
// ========================================
export type ProvinceLine = {
  province: string;
  districts: number;
  activities: number;
  beneficiaries: number;
  fundUsed: number;
};

export async function getProvinceBreakdown(filters: DistrictFilters = {}): Promise<ProvinceLine[]> {
  const lines = await getDistrictBreakdown(filters);

  const map = new Map<string, ProvinceLine>();

  for (const line of lines) {
    const key = line.province || 'Other';
    const entry = map.get(key) ?? {
      province: key,
      districts: 0,
      activities: 0,
      beneficiaries: 0,
      fundUsed: 0,
    };

    entry.districts += 1;
    entry.activities += line.activities;
    entry.beneficiaries += line.beneficiaries;
    entry.fundUsed += line.fundUsed;

    map.set(key, entry);
  }

  return [...map.values()].sort((a, b) => b.activities - a.activities);
}

// ========================================
// THE ACTIVITY TYPES THE DROP-DOWN OFFERS
// ========================================
// Free text is allowed (the office can type its own), but these suggestions keep
// the reports tidy because everybody picks from the same list.
export const ACTIVITY_TYPE_SUGGESTIONS = [
  'Education',
  'Health',
  'Women empowerment',
  'Environment',
  'Youth leadership',
  'Sports',
  'Disaster relief',
  'Awareness campaign',
  'Meeting',
  'Training',
  'Other',
];

/** Which activity types have actually been used (for the filter drop-down). */
export async function getUsedActivityTypes(): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await prisma.districtActivity.findMany({
      where: { isDeleted: false, activityType: { not: null } },
      select: { activityType: true },
      distinct: ['activityType'],
      orderBy: { activityType: 'asc' },
    });

    return rows.map((row) => String(row.activityType)).filter(Boolean);
  } catch {
    return [];
  }
}
