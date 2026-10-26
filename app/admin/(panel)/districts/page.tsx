import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - DISTRICT WORK (77 DISTRICTS)
// ========================================
// Address: /admin/districts?district=Kaski&year=2026&type=&status=
//
// THE TWO HALVES OF THIS PAGE
//   1. TOP   - the analytics: how many activities, how many beneficiaries, how
//              many members took part, how much fund was used, and how many are
//              completed / ongoing / planned. Filter it by district, year, type
//              or status.
//   2. BELOW - the activity records themselves, where the office adds and edits
//              them. Each activity keeps the numbers that were actually
//              recorded; an empty box stays empty and shows as a dash.
//
// WHERE THE NUMBERS COME FROM
//   lib/district/analytics.ts reads the rows and adds them up. Nothing on this
//   page is a stored total, so the cards can never drift away from the records.
//
// MONEY
//   "Fund used" is the organization's own note of what an activity cost. It is
//   NOT part of the fund balance and is never added to it.
//
// WHO MAY USE IT
//   Any administrator can record district work (requireAdmin); the figures are
//   not private financial data.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { requireAdmin } from '@/lib/auth/guards';
import { getDistrictAnalytics, type DistrictFilters } from '@/lib/district/analytics';
import {
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  activityTypeLabel,
} from '@/lib/district/schemas';
import { DISTRICT_OPTIONS } from '@/config/districts';
import { formatMoney } from '@/lib/fund/calc';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.districts'), robots: { index: false, follow: false } };
}

// ========================================
// ONE SUMMARY CARD
// ========================================
function Card({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: 'default' | 'good' | 'warn';
}) {
  const toneClasses = {
    default: 'text-ink-900',
    good: 'text-green-700',
    warn: 'text-amber-700',
  }[tone];

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <Icon name={icon} className="h-4 w-4 shrink-0 text-ink-400" />
      </div>
      <p className={`mt-2 font-display text-xl font-bold ${toneClasses}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export default async function DistrictActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    district?: string;
    year?: string;
    type?: string;
    status?: string;
  }>;
}) {
  await requireAdmin();

  const params = await searchParams;

  const filters: DistrictFilters = {
    district: params.district || null,
    year: params.year ? Number(params.year) || null : null,
    activityType: params.type || null,
    status: params.status || null,
  };

  const analytics = await getDistrictAnalytics(filters);

  // The largest bar, so the bars are drawn to scale.
  const provinceMax = Math.max(1, ...analytics.byProvince.map((row) => row.activities));
  const typeMax = Math.max(1, ...analytics.byType.map((row) => row.activities));

  // ---------- The form fields of one activity ----------
  const FIELDS: FieldConfig[] = [
    // --- where ---
    {
      name: 'district',
      label: 'District',
      type: 'select',
      required: true,
      section: 'Where',
      hint: 'All 77 districts are listed. The analytics counts on this being exact.',
      options: DISTRICT_OPTIONS,
    },
    { name: 'municipality', label: 'Municipality / rural municipality', type: 'text', section: 'Where' },
    { name: 'ward', label: 'Ward', type: 'text', section: 'Where' },

    // --- what ---
    { name: 'title', label: 'Activity name', type: 'text', required: true, section: 'What happened' },
    {
      name: 'activityType',
      label: 'Type of activity',
      type: 'select',
      required: true,
      section: 'What happened',
      options: ACTIVITY_TYPE_OPTIONS,
    },
    {
      name: 'description',
      label: 'What was done',
      type: 'textarea',
      section: 'What happened',
      hint: 'Write it as you would tell the committee. This is the organization’s own record.',
    },

    // --- how many ---
    {
      name: 'beneficiaries',
      label: 'Beneficiaries (how many people benefited)',
      type: 'number',
      section: 'Numbers',
      hint: 'Leave empty if you did not count. An empty box shows as a dash and is never guessed.',
    },
    {
      name: 'membersInvolved',
      label: 'Members involved',
      type: 'number',
      section: 'Numbers',
      hint: 'How many of our own members took part.',
    },

    // --- when and how much ---
    { name: 'activityDate', label: 'Date of the activity', type: 'nepali-date', required: true, section: 'When and how much' },
    {
      name: 'amountUsed',
      label: 'Fund used (whole rupees)',
      type: 'number',
      section: 'When and how much',
      hint: 'Your own note of the cost. This is NOT added to the fund balance.',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      section: 'When and how much',
      options: ACTIVITY_STATUS_OPTIONS,
    },
    { name: 'responsibleTeam', label: 'Responsible team / person', type: 'text', section: 'When and how much' },

    // --- proof ---
    {
      name: 'photoUrls',
      label: 'Photo links (one per line)',
      type: 'lines',
      section: 'Photos and documents',
      hint: 'Paste image links. On your own computer you can also upload from the Media library.',
    },
    {
      name: 'documentUrls',
      label: 'Document links (one per line)',
      type: 'lines',
      section: 'Photos and documents',
      hint: 'Reports, attendance sheets, letters - anything that belongs with this activity.',
    },
  ];

  // ---------- The columns of the table ----------
  const COLUMNS: ColumnConfig[] = [
    { name: 'title', label: 'Activity' },
    { name: 'district', label: 'District' },
    { name: 'municipality', label: 'Municipality', hideOnMobile: true },
    { name: 'activityDate', label: 'Date', type: 'nepali-date' },
    { name: 'beneficiaries', label: 'Benefited', type: 'number' },
    { name: 'membersInvolved', label: 'Members', type: 'number' },
    { name: 'amountUsed', label: 'Fund used', type: 'money' },
    { name: 'status', label: 'Status', type: 'badge' },
  ];

  return (
    <div className="space-y-8">
      {/* ========================================
          HEADER
          ======================================== */}
      <SectionHeading
        eyebrow="Field work"
        icon="layers"
        title="District work (77 districts)"
        description="What the organization did in each district, with the figures that were actually recorded. All 77 districts of Nepal are available."
      />

      {/* ========================================
          FILTERS FOR THE OVERVIEW
          ======================================== */}
      <form method="get" className="card p-5">
        <p className="text-sm font-semibold text-ink-700">Overview filters</p>
        <p className="mt-1 text-xs text-ink-500">
          These change the cards and the breakdown below. The records table has its own search box.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">District</span>
            <select name="district" defaultValue={params.district ?? ''} className="input">
              <option value="">All districts</option>
              {DISTRICT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Year</span>
            <select name="year" defaultValue={params.year ?? ''} className="input">
              <option value="">All years</option>
              {analytics.availableYears.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Type</span>
            <select name="type" defaultValue={params.type ?? ''} className="input">
              <option value="">Any type</option>
              {ACTIVITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Status</span>
            <select name="status" defaultValue={params.status ?? ''} className="input">
              <option value="">Any status</option>
              {ACTIVITY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary btn-sm">
            <Icon name="search" className="h-4 w-4" />
            Apply
          </button>
          <Link href="/admin/districts" className="btn btn-outline btn-sm">
            Clear
          </Link>
        </div>
      </form>

      {/* ========================================
          THE CARDS
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Total activities"
          value={String(analytics.totalActivities)}
          icon="layers"
          hint={`${analytics.districtsWithActivities} of 77 districts have activity`}
        />
        <Card
          label="Total beneficiaries"
          value={String(analytics.totalBeneficiaries)}
          icon="users"
          hint={
            analytics.activitiesWithoutFigures > 0
              ? `${analytics.activitiesWithoutFigures} activity(ies) recorded no figure`
              : 'Every activity has a figure'
          }
        />
        <Card
          label="Members involved"
          value={String(analytics.totalMembersInvolved)}
          icon="user"
          hint="Our own members who took part"
        />
        <Card
          label="Fund used"
          value={formatMoney(analytics.totalFundUsed)}
          icon="banknote"
          hint="The organization’s own note of the cost (not part of the fund balance)"
        />
        <Card label="Completed" value={String(analytics.completed)} icon="check-circle" tone="good" />
        <Card label="Ongoing" value={String(analytics.ongoing)} icon="clock" tone="warn" />
        <Card label="Planned" value={String(analytics.planned)} icon="calendar" />
        <Card label="Cancelled" value={String(analytics.cancelled)} icon="info" />
      </div>

      {/* ========================================
          BREAKDOWNS
          ======================================== */}
      {analytics.totalActivities === 0 ? (
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink-900">No district work yet</h3>
          <p className="mt-2 text-sm text-ink-600">
            Add the first activity below with <strong>Add district activity</strong>. As soon as one
            is saved, these cards and the breakdowns appear.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ---------- By province ---------- */}
          <section className="card p-5">
            <h3 className="font-display text-base font-bold text-ink-900">By province</h3>
            <p className="mt-1 text-xs text-ink-500">
              Activities per province, worked out from the district of each activity.
            </p>

            <div className="mt-4 space-y-3">
              {analytics.byProvince.map((row) => (
                <div key={row.province}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-ink-800">{row.province}</span>
                    <span className="text-ink-500">
                      {row.activities} activit{row.activities === 1 ? 'y' : 'ies'} ·{' '}
                      {row.beneficiaries} benefited
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${Math.round((row.activities / provinceMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ---------- By type ---------- */}
          <section className="card p-5">
            <h3 className="font-display text-base font-bold text-ink-900">By type of activity</h3>
            <p className="mt-1 text-xs text-ink-500">Where the organization spends its effort.</p>

            <div className="mt-4 space-y-3">
              {analytics.byType.map((row) => (
                <div key={row.type}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-ink-800">{row.label}</span>
                    <span className="text-ink-500">{row.activities}</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-400"
                      style={{ width: `${Math.round((row.activities / typeMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ---------- By year ---------- */}
          <section className="card p-5 lg:col-span-2">
            <h3 className="font-display text-base font-bold text-ink-900">By year</h3>
            <p className="mt-1 text-xs text-ink-500">
              Years are never deleted, so this table keeps the whole history.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-ink-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3 text-right">Activities</th>
                    <th className="px-4 py-3 text-right">Beneficiaries</th>
                    <th className="px-4 py-3 text-right">Fund used</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byYear.map((row) => (
                    <tr key={row.year} className="border-t border-ink-100">
                      <td className="px-4 py-3 font-medium text-ink-900">{row.year}</td>
                      <td className="px-4 py-3 text-right">{row.activities}</td>
                      <td className="px-4 py-3 text-right">{row.beneficiaries}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.fundUsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ---------- District table ---------- */}
          <section className="card p-5 lg:col-span-2">
            <h3 className="font-display text-base font-bold text-ink-900">
              Districts worked in ({analytics.byDistrict.length} of 77)
            </h3>
            <p className="mt-1 text-xs text-ink-500">
              Ordered by how much has been done. The 77 districts that are not listed have no
              activity recorded yet.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-ink-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Province</th>
                    <th className="px-4 py-3 text-right">Activities</th>
                    <th className="px-4 py-3 text-right">Beneficiaries</th>
                    <th className="px-4 py-3 text-right">Members</th>
                    <th className="px-4 py-3 text-right">Fund used</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byDistrict.map((row) => (
                    <tr key={row.district} className="border-t border-ink-100">
                      <td className="px-4 py-3 font-medium text-ink-900">{row.district}</td>
                      <td className="px-4 py-3 text-ink-600">{row.province}</td>
                      <td className="px-4 py-3 text-right">{row.activities}</td>
                      <td className="px-4 py-3 text-right">{row.beneficiaries}</td>
                      <td className="px-4 py-3 text-right">{row.membersInvolved}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{formatMoney(row.fundUsed)}</td>
                      <td className="px-4 py-3 text-xs text-ink-600">
                        {row.completed} done · {row.ongoing} ongoing · {row.planned} planned
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================
          THE RECORDS TABLE
          ======================================== */}
      <div id="district-records" className="rounded-card">
        <ResourceManager
          resourceKey="district-activities"
          entityLabel="district activity"
          title="Activity records"
          description="Every district activity that has been recorded. Add, edit or remove them here. Removing hides a row instead of destroying it, so the history stays complete."
          fields={FIELDS}
          columns={COLUMNS}
          statusOptions={ACTIVITY_STATUS_OPTIONS}
          statusField="status"
          defaults={{ status: 'PLANNED' }}
        />
      </div>

      {/* ========================================
          A SHORT EXPLANATION OF WHAT IS COUNTED
          ======================================== */}
      <section className="card p-5">
        <h3 className="font-display text-base font-bold text-ink-900">How these figures work</h3>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li className="flex gap-2">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              A blank beneficiary box stays blank. It is shown as a dash and is <strong>never</strong>{' '}
              counted as zero and never guessed, so the totals only add up what somebody actually
              counted.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="briefcase" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              <strong>Fund used</strong> is a note of what an activity cost. It is not part of the{' '}
              <Link href="/admin/fund" className="font-semibold text-brand-700 hover:underline">
                fund balance
              </Link>{' '}
              and is never added to it.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              The type of each activity is taken from the drop-down, which is why the breakdown by
              type always adds up to the total.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
