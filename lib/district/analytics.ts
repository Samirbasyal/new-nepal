// ========================================
// DISTRICT WORK - THE NUMBERS
// ========================================
// Everything the district analytics screen shows is worked out here, from the
// activity rows themselves.
//
// THE RULE ABOUT FIGURES
//   A beneficiary count is only added up when somebody actually entered it.
//   Nothing is estimated, and an activity with no numbers recorded does not
//   pull an average down - it is simply counted as an activity.
//
// MONEY
//   "Fund used" is the organization's own note of what a district activity
//   cost. It is NOT the fund balance and it is never mixed into it: the balance
//   on the fund screens only counts approved payments and approved expenses.
// ========================================

import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { provinceOf } from '@/config/districts';
import { ACTIVITY_TYPE_OPTIONS } from '@/lib/district/schemas';

// ========================================
// WHAT CAN BE FILTERED
// ========================================
export type DistrictFilters = {
  district?: string | null;
  year?: number | null;
  activityType?: string | null;
  status?: string | null;
  /** Free text: activity name, municipality or team. */
  search?: string | null;
};

/** Turn the filters into a database "where" clause. */
function buildWhere(filters: DistrictFilters) {
  const search = (filters.search ?? '').trim();

  return {
    isDeleted: false,
    ...(filters.district ? { district: filters.district } : {}),
    ...(filters.activityType ? { activityType: filters.activityType } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.year
      ? {
          activityDate: {
            gte: new Date(filters.year, 0, 1),
            lte: new Date(filters.year, 11, 31, 23, 59, 59, 999),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { municipality: { contains: search } },
            { responsibleTeam: { contains: search } },
            { district: { contains: search } },
          ],
        }
      : {}),
  };
}

// ========================================
// THE SHAPE OF THE ANSWER
// ========================================
export type ProvinceSummary = {
  province: string;
  activities: number;
  beneficiaries: number;
  membersInvolved: number;
  fundUsed: number;
};

export type TypeSummary = {
  type: string;
  label: string;
  activities: number;
  beneficiaries: number;
};

export type DistrictSummary = {
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

export type YearSummary = {
  year: number;
  activities: number;
  beneficiaries: number;
  fundUsed: number;
};

export type DistrictAnalytics = {
  /** ---- the headline cards ---- */
  totalActivities: number;
  totalBeneficiaries: number;
  totalMembersInvolved: number;
  totalFundUsed: number;
  completed: number;
  ongoing: number;
  planned: number;
  cancelled: number;
  /** How many of the 77 districts have at least one activity recorded. */
  districtsWithActivities: number;
  /** How many activities did not record a beneficiary figure. */
  activitiesWithoutFigures: number;

  /** ---- breakdowns ---- */
  byProvince: ProvinceSummary[];
  byType: TypeSummary[];
  byDistrict: DistrictSummary[];
  byYear: YearSummary[];

  /** ---- for the year drop-down (every year that has any activity) ---- */
  availableYears: number[];
};

/** An empty answer, used when the database is not connected. */
function emptyAnalytics(): DistrictAnalytics {
  return {
    totalActivities: 0,
    totalBeneficiaries: 0,
    totalMembersInvolved: 0,
    totalFundUsed: 0,
    completed: 0,
    ongoing: 0,
    planned: 0,
    cancelled: 0,
    districtsWithActivities: 0,
    activitiesWithoutFigures: 0,
    byProvince: [],
    byType: [],
    byDistrict: [],
    byYear: [],
    availableYears: [],
  };
}

// ========================================
// THE MAIN FUNCTION
// ========================================
/**
 * Add up every district activity that matches the filters.
 *
 * The rows are read once and added up in memory. That is deliberate: it keeps
 * the screen to a single database round trip, and if the organization ever
 * records tens of thousands of activities this is the one place that needs a
 * different approach.
 */
export async function getDistrictAnalytics(
  filters: DistrictFilters = {},
): Promise<DistrictAnalytics> {
  if (!isDatabaseConfigured()) return emptyAnalytics();

  try {
    const [rows, years] = await Promise.all([
      prisma.districtActivity.findMany({
        where: buildWhere(filters),
        select: {
          district: true,
          activityType: true,
          status: true,
          beneficiaries: true,
          membersInvolved: true,
          amountUsed: true,
          activityDate: true,
        },
        orderBy: { activityDate: 'desc' },
        take: 10000,
      }),
      // The year list is built from EVERY activity, so the drop-down still
      // offers last year even while a different year is selected.
      prisma.districtActivity.findMany({
        where: { isDeleted: false },
        select: { activityDate: true },
        take: 10000,
      }),
    ]);

    const analytics = emptyAnalytics();

    // ---------- totals ----------
    const byProvinceMap = new Map<string, ProvinceSummary>();
    const byTypeMap = new Map<string, TypeSummary>();
    const byDistrictMap = new Map<string, DistrictSummary>();
    const byYearMap = new Map<number, YearSummary>();

    for (const row of rows) {
      const beneficiaries = Math.max(0, row.beneficiaries ?? 0);
      const membersInvolved = Math.max(0, row.membersInvolved ?? 0);
      const fundUsed = Math.max(0, row.amountUsed ?? 0);
      const year = row.activityDate.getFullYear();

      analytics.totalActivities += 1;
      analytics.totalBeneficiaries += beneficiaries;
      analytics.totalMembersInvolved += membersInvolved;
      analytics.totalFundUsed += fundUsed;

      if (!row.beneficiaries) analytics.activitiesWithoutFigures += 1;

      if (row.status === 'COMPLETED') analytics.completed += 1;
      else if (row.status === 'ONGOING') analytics.ongoing += 1;
      else if (row.status === 'CANCELLED') analytics.cancelled += 1;
      else analytics.planned += 1;

      // ---------- by province ----------
      const province = provinceOf(row.district) ?? 'Unknown';
      const provinceRow =
        byProvinceMap.get(province) ??
        { province, activities: 0, beneficiaries: 0, membersInvolved: 0, fundUsed: 0 };
      provinceRow.activities += 1;
      provinceRow.beneficiaries += beneficiaries;
      provinceRow.membersInvolved += membersInvolved;
      provinceRow.fundUsed += fundUsed;
      byProvinceMap.set(province, provinceRow);

      // ---------- by type ----------
      const type = String(row.activityType ?? 'OTHER');
      const typeRow =
        byTypeMap.get(type) ??
        {
          type,
          label: ACTIVITY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type,
          activities: 0,
          beneficiaries: 0,
        };
      typeRow.activities += 1;
      typeRow.beneficiaries += beneficiaries;
      byTypeMap.set(type, typeRow);

      // ---------- by district ----------
      const districtRow =
        byDistrictMap.get(row.district) ??
        {
          district: row.district,
          province,
          activities: 0,
          beneficiaries: 0,
          membersInvolved: 0,
          fundUsed: 0,
          completed: 0,
          ongoing: 0,
          planned: 0,
        };
      districtRow.activities += 1;
      districtRow.beneficiaries += beneficiaries;
      districtRow.membersInvolved += membersInvolved;
      districtRow.fundUsed += fundUsed;
      if (row.status === 'COMPLETED') districtRow.completed += 1;
      else if (row.status === 'ONGOING') districtRow.ongoing += 1;
      else if (row.status !== 'CANCELLED') districtRow.planned += 1;
      byDistrictMap.set(row.district, districtRow);

      // ---------- by year ----------
      const yearRow = byYearMap.get(year) ?? { year, activities: 0, beneficiaries: 0, fundUsed: 0 };
      yearRow.activities += 1;
      yearRow.beneficiaries += beneficiaries;
      yearRow.fundUsed += fundUsed;
      byYearMap.set(year, yearRow);
    }

    analytics.districtsWithActivities = byDistrictMap.size;

    analytics.byProvince = [...byProvinceMap.values()].sort((a, b) => b.activities - a.activities);
    analytics.byType = [...byTypeMap.values()].sort((a, b) => b.activities - a.activities);
    analytics.byDistrict = [...byDistrictMap.values()].sort((a, b) => {
      if (b.activities !== a.activities) return b.activities - a.activities;
      return a.district.localeCompare(b.district);
    });
    analytics.byYear = [...byYearMap.values()].sort((a, b) => b.year - a.year);

    analytics.availableYears = [
      ...new Set(years.map((row) => row.activityDate.getFullYear())),
    ].sort((a, b) => b - a);

    return analytics;
  } catch (error) {
    console.error('[district] could not work out the district analytics:', error);
    return emptyAnalytics();
  }
}
