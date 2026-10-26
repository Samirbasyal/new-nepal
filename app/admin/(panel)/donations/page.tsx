import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - DONATION RECORDS
// ========================================
// Address: /admin/donations?year=2026
//
// WHAT THIS SCREEN IS
//   The office's record of money given to the organization by donors - people
//   and businesses who are NOT paying a monthly member contribution.
//
// THE RULE THAT KEEPS THE BOOKS HONEST
//   A donation is separate from the monthly member fund at every level: its own
//   table, its own status and its own totals. Only a VERIFIED donation counts
//   towards the figures on this page. Nothing here is ever added to the member
//   fund, the loan figures or the expenses.
//
// THE THREE PARTS OF THE PAGE
//   1. the seven summary cards (total, this month, this year, waiting, verified,
//      number of donors, average donation)
//   2. the donations that are waiting to be checked, with a Verify / Reject
//      button on each one
//   3. the full records table, with search, a status filter, editing and paging
//
// WHO MAY USE IT
//   Any administrator (the layout checks it) and the API checks the role again.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { DonationDecisionPanel } from '@/components/admin/DonationDecisionPanel';
import { DonationQuickActions } from '@/components/admin/DonationQuickActions';
import type { FieldConfig, ColumnConfig } from '@/components/admin/types';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import {
  DONATION_METHOD_OPTIONS,
  DONATION_STATUS_OPTIONS,
  DONATION_TYPE_OPTIONS,
} from '@/lib/donation/schemas';
import { DONATION_PURPOSES } from '@/lib/donation/purposes';
import { formatMoney } from '@/lib/fund/calc';
import { formatDate } from '@/lib/utils';
import { withNepaliDate } from '@/lib/nepali-date';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.donations'), robots: { index: false, follow: false } };
}

/** A friendly name for one donation type. */
function typeLabel(value: string | null | undefined): string {
  return (
    DONATION_TYPE_OPTIONS.find((option) => option.value === String(value ?? ''))?.label ??
    String(value ?? '—')
  );
}

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
  const toneClasses = { default: 'text-ink-900', good: 'text-green-700', warn: 'text-amber-700' }[tone];

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

export default async function AdminDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const thisYear = new Date().getFullYear();
  const year = Number(params.year ?? thisYear) || thisYear;

  // ========================================
  // THE DATE RANGE OF THE PURPOSE REPORT
  // ========================================
  // Two plain dates, both optional. They only affect the report further down,
  // never the record list, so the office can ask "what came in for health work
  // between these two days?" without losing sight of everything else.
  function parseDay(value: string | undefined): Date | null {
    const text = (value ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const date = new Date(`${text}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fromDay = parseDay(params.from);
  const toDay = parseDay(params.to);

  // The end date is inclusive: "to 2026-10-17" must include that whole day.
  const rangeStart = fromDay;
  const rangeEnd = toDay ? new Date(toDay.getTime() + 24 * 60 * 60 * 1000) : null;

  const rangeLabel =
    fromDay || toDay
      ? `${fromDay ? withNepaliDate(fromDay) : 'the beginning'} to ${toDay ? withNepaliDate(toDay) : 'today'}`
      : 'All time';

  // Two ready-made dates for the quick buttons, built from the server's own clock
  // so a link never offers a range in the future.
  const now = new Date();
  const two = (value: number) => String(value).padStart(2, '0');
  const todayIso = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  const thisMonthIso = `${now.getFullYear()}-${two(now.getMonth() + 1)}-01`;

  // ========================================
  // READ THE DONATIONS ONCE AND ADD THEM UP
  // ========================================
  let rows: {
    id: string;
    donorName: string;
    donorEmail: string | null;
    donorPhone: string | null;
    amount: number;
    currency: string;
    method: string;
    donationType: string;
    purpose: string | null;
    reference: string | null;
    receiptUrl: string | null;
    status: string;
    remarks: string | null;
    receivedOn: Date;
    recordedBy: string | null;
  }[] = [];

  let availableYears: number[] = [];

  if (isDatabaseConfigured()) {
    try {
      const [all, years] = await Promise.all([
        prisma.donation.findMany({
          where: { isDeleted: false },
          orderBy: { receivedOn: 'desc' },
          take: 5000,
          select: {
            id: true,
            donorName: true,
            donorEmail: true,
            donorPhone: true,
            amount: true,
            currency: true,
            method: true,
            donationType: true,
            purpose: true,
            reference: true,
            receiptUrl: true,
            status: true,
            remarks: true,
            receivedOn: true,
            recordedBy: true,
          },
        }),
        prisma.donation.findMany({ where: { isDeleted: false }, select: { receivedOn: true }, take: 5000 }),
      ]);

      rows = all;
      availableYears = [...new Set(years.map((row) => row.receivedOn.getFullYear()))].sort((a, b) => b - a);
    } catch (error) {
      console.error('[donations] could not load the donation records:', error);
    }
  }

  const verified = rows.filter((row) => row.status === 'VERIFIED');

  // A donation the office has asked a question about is STILL waiting: it has not
  // been approved and it must not disappear from the queue, or it would be
  // forgotten. Both states sit in one list, and the card says which one it is.
  const pending = rows.filter((row) => row.status === 'PENDING' || row.status === 'INFO_REQUIRED');

  const rejected = rows.filter((row) => row.status === 'REJECTED');

  const totalVerified = verified.reduce((sum, row) => sum + row.amount, 0);

  const monthStartDate = new Date();
  monthStartDate.setDate(1);
  monthStartDate.setHours(0, 0, 0, 0);

  const verifiedThisMonth = verified
    .filter((row) => row.receivedOn.getTime() >= monthStartDate.getTime())
    .reduce((sum, row) => sum + row.amount, 0);

  const verifiedThisYear = verified
    .filter((row) => row.receivedOn.getFullYear() === year)
    .reduce((sum, row) => sum + row.amount, 0);

  const pendingAmount = pending.reduce((sum, row) => sum + row.amount, 0);

  const donorCount = new Set(
    verified.map((row) => (row.donorEmail || row.donorName || '').toLowerCase()).filter(Boolean),
  ).size;

  const averageDonation = verified.length > 0 ? Math.round(totalVerified / verified.length) : 0;

  // ========================================
  // THE PURPOSE REPORT
  // ========================================
  // A saved purpose is the human label ("Health and Medical Support"), because
  // that is what the record list prints. Grouping therefore matches on the label
  // prefix - the "Other / General Donation - <own words>" case still falls under
  // General. An empty purpose counts as General too: money given without a
  // stated cause is still money the club received.
  function purposeCodeOf(rawPurpose: string | null): string {
    const text = (rawPurpose ?? '').trim();
    if (text === '') return 'GENERAL';

    const hit = DONATION_PURPOSES.find(
      (purpose) => text === purpose.label || text.startsWith(`${purpose.label} `),
    );

    return hit?.code ?? 'GENERAL';
  }

  function inRange(row: { receivedOn: Date }): boolean {
    const time = row.receivedOn.getTime();
    if (rangeStart && time < rangeStart.getTime()) return false;
    if (rangeEnd && time >= rangeEnd.getTime()) return false;
    return true;
  }

  const rowsInRange = rows.filter(inRange);

  const byPurpose = DONATION_PURPOSES.map((purpose) => {
    const approved = rowsInRange.filter(
      (row) => row.status === 'VERIFIED' && purposeCodeOf(row.purpose) === purpose.code,
    );

    const waiting = rowsInRange.filter(
      (row) =>
        (row.status === 'PENDING' || row.status === 'INFO_REQUIRED' || row.status === 'INITIATED') &&
        purposeCodeOf(row.purpose) === purpose.code,
    );

    return {
      code: purpose.code,
      label: purpose.label,
      icon: purpose.icon,
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, row) => sum + row.amount, 0),
      waitingCount: waiting.length,
      waitingAmount: waiting.reduce((sum, row) => sum + row.amount, 0),
    };
  });

  const reportApprovedTotal = byPurpose.reduce((sum, row) => sum + row.approvedAmount, 0);
  const reportWaitingTotal = byPurpose.reduce((sum, row) => sum + row.waitingAmount, 0);

  // Only the purposes that have something to show, so the table never looks like
  // a list of empty rows. The last (General) entry stays even when empty, because
  // it is the place unlabelled money lands.
  const purposeRows = byPurpose.filter(
    (row) => row.approvedCount > 0 || row.waitingCount > 0 || row.code === 'GENERAL',
  );

  // ========================================
  // THE FORM
  // ========================================
  const FIELDS: FieldConfig[] = [
    {
      name: 'donorName',
      label: 'Donor name',
      type: 'text',
      required: true,
      section: 'Who gave',
      hint: 'The person, family or organization that gave.',
    },
    { name: 'donorEmail', label: 'Donor email (optional)', type: 'email', section: 'Who gave' },
    { name: 'donorPhone', label: 'Donor phone (optional)', type: 'text', section: 'Who gave' },

    {
      name: 'amount',
      label: 'Amount (whole rupees)',
      type: 'number',
      required: true,
      section: 'What was given',
    },
    { name: 'currency', label: 'Currency', type: 'text', section: 'What was given', placeholder: 'NPR' },
    {
      name: 'donationType',
      label: 'Type of donation',
      type: 'select',
      section: 'What was given',
      options: DONATION_TYPE_OPTIONS,
    },
    {
      name: 'method',
      label: 'How it arrived',
      type: 'select',
      section: 'What was given',
      options: DONATION_METHOD_OPTIONS,
    },
    { name: 'reference', label: 'Receipt / reference number', type: 'text', section: 'What was given' },
    { name: 'receivedOn', label: 'Date received', type: 'nepali-date', required: true, section: 'What was given' },
    {
      name: 'purpose',
      label: 'Purpose (what the donor wanted it used for)',
      type: 'text',
      section: 'What was given',
      hint: 'Leave empty if the donor did not say.',
    },

    {
      name: 'status',
      label: 'Status',
      type: 'select',
      section: 'Checking',
      options: DONATION_STATUS_OPTIONS,
      hint: 'Record it as Verified straight away when the money is already in hand.',
    },
    {
      name: 'remarks',
      label: 'Remarks',
      type: 'textarea',
      section: 'Checking',
      hint: 'Anything the office needs to remember about this donation.',
    },
    { name: 'note', label: 'Note', type: 'textarea', section: 'Checking' },
  ];

  // ========================================
  // THE TABLE
  // ========================================
  const COLUMNS: ColumnConfig[] = [
    { name: 'donorName', label: 'Donor' },
    { name: 'donorEmail', label: 'Email', hideOnMobile: true },
    { name: 'donorPhone', label: 'Phone', hideOnMobile: true },
    { name: 'amount', label: 'Amount', type: 'money' },
    { name: 'currency', label: 'Currency', hideOnMobile: true },
    { name: 'receivedOn', label: 'Received', type: 'nepali-date' },
    { name: 'donationType', label: 'Type', hideOnMobile: true },
    { name: 'method', label: 'Method', hideOnMobile: true },
    { name: 'purpose', label: 'Purpose', type: 'longtext', hideOnMobile: true },
    { name: 'status', label: 'Status', type: 'badge' },
    { name: 'reference', label: 'Receipt no.', hideOnMobile: true },
    { name: 'remarks', label: 'Remarks', type: 'longtext', hideOnMobile: true },
    { name: 'recordedBy', label: 'Added by', hideOnMobile: true },
  ];

  return (
    <div className="space-y-8">
      {/* ========================================
          HEADER + YEAR PICKER
          ======================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Donations"
          icon="heart"
          title="Donation records"
          description="Money given by donors. Only verified donations count. Nothing here is ever added to the member fund, the loans or the expenses."
        />

        <div className="flex flex-wrap items-end gap-2">
          {/* Where a donor sends the money. Kept on its own screen so that fixing a
              donor's record can never move the club's bank account. */}
          <Link href="/admin/donations/payment-details" className="btn btn-outline btn-sm">
            <Icon name="qr-code" className="h-4 w-4" />
            Bank &amp; QR details
          </Link>

          <Link href="/admin/donations/removed" className="btn btn-outline btn-sm">
            <Icon name="trash" className="h-4 w-4" />
            Removed
          </Link>

          <form method="get" className="flex items-end gap-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Year</span>
              <select name="year" defaultValue={String(year)} className="input">
                {[...new Set([thisYear, ...availableYears])].map((option) => (
                  <option key={option} value={String(option)}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-outline btn-sm">
              <Icon name="search" className="h-4 w-4" />
              Show
            </button>
          </form>
        </div>
      </div>

      {/* ========================================
          THE SEVEN CARDS
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Total donations"
          value={formatMoney(totalVerified)}
          icon="heart"
          tone="good"
          hint={`${verified.length} verified donation(s), all time`}
        />
        <Card label="This month" value={formatMoney(verifiedThisMonth)} icon="calendar" tone="good" />
        <Card label={`In ${year}`} value={formatMoney(verifiedThisYear)} icon="chart" />
        <Card
          label="Pending donations"
          value={formatMoney(pendingAmount)}
          icon="clock"
          tone={pending.length > 0 ? 'warn' : 'default'}
          hint={`${pending.length} donation(s) waiting to be checked - NOT counted as received`}
        />
        <Card
          label="Verified donations"
          value={String(verified.length)}
          icon="check-circle"
          tone="good"
          hint={rejected.length > 0 ? `${rejected.length} rejected` : 'None rejected'}
        />
        <Card
          label="Number of donors"
          value={String(donorCount)}
          icon="users"
          hint="Different people or organizations that gave"
        />
        <Card
          label="Average donation"
          value={formatMoney(averageDonation)}
          icon="chart"
          hint="Total ÷ number of verified donations"
        />
        <Card
          label="Records on this screen"
          value={String(rows.length)}
          icon="file-text"
          hint="Every donation ever recorded"
        />
      </div>

      {/* ========================================
          WHERE THE MONEY WENT - PURPOSE REPORT + DATE FILTER
          ======================================== */}
      <section id="donation-purposes" className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">
              Where the money went - by purpose
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              {rangeLabel}. Only approved donations count as money received; waiting ones are shown
              beside them, never added in.
            </p>
          </div>

          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="year" value={String(year)} />

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-700">From</span>
              <input type="date" name="from" defaultValue={params.from ?? ''} className="input" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-700">To</span>
              <input type="date" name="to" defaultValue={params.to ?? ''} className="input" />
            </label>

            <button type="submit" className="btn btn-outline btn-sm">
              <Icon name="filter" className="h-4 w-4" />
              Show
            </button>
          </form>
        </div>

        {/* ---------- quick ranges ---------- */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link
            href={`/admin/donations?year=${thisYear}&from=${thisMonthIso}&to=${todayIso}`}
            className="rounded-full border border-ink-200 px-3 py-1 font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-700"
          >
            This month
          </Link>
          <Link
            href={`/admin/donations?year=${thisYear}&from=${thisYear}-01-01&to=${todayIso}`}
            className="rounded-full border border-ink-200 px-3 py-1 font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-700"
          >
            This year
          </Link>
          <Link
            href={`/admin/donations?year=${thisYear}`}
            className="rounded-full border border-ink-200 px-3 py-1 font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-700"
          >
            All time
          </Link>
        </div>

        {/* ---------- the table ---------- */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-[11px] uppercase tracking-wide text-ink-500">
                <th className="py-2 pr-3 font-semibold">Purpose</th>
                <th className="py-2 pr-3 text-right font-semibold">Approved</th>
                <th className="py-2 pr-3 text-right font-semibold">Donations</th>
                <th className="py-2 pr-3 text-right font-semibold">Waiting</th>
                <th className="py-2 pl-3 font-semibold">Share of approved</th>
              </tr>
            </thead>

            <tbody>
              {purposeRows.map((row) => {
                const share =
                  reportApprovedTotal > 0 ? Math.round((row.approvedAmount / reportApprovedTotal) * 100) : 0;

                return (
                  <tr key={row.code} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2 text-ink-800">
                        <Icon name={row.icon} className="h-4 w-4 shrink-0 text-ink-400" />
                        {row.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-ink-900">
                      {formatMoney(row.approvedAmount)}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-600">{row.approvedCount}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {row.waitingCount > 0 ? (
                        <span className="text-amber-700">
                          {formatMoney(row.waitingAmount)}
                          <span className="ml-1 text-xs text-ink-400">({row.waitingCount})</span>
                        </span>
                      ) : (
                        <span className="text-ink-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                          <span
                            className="block h-full rounded-full bg-brand-500"
                            style={{ width: `${share}%` }}
                          />
                        </span>
                        <span className="text-xs text-ink-500">{share}%</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="border-t border-ink-200 text-ink-900">
                <td className="py-2.5 pr-3 font-semibold">Total</td>
                <td className="py-2.5 pr-3 text-right font-bold">{formatMoney(reportApprovedTotal)}</td>
                <td className="py-2.5 pr-3 text-right font-semibold">
                  {byPurpose.reduce((sum, row) => sum + row.approvedCount, 0)}
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-amber-700">
                  {reportWaitingTotal > 0 ? formatMoney(reportWaitingTotal) : '-'}
                </td>
                <td className="py-2.5 pl-3 text-xs text-ink-500">Not counted as received</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-3 text-xs text-ink-500">
          A donation is grouped by the cause the donor chose. A gift with no cause recorded, or one
          written in the donor&apos;s own words under &quot;Other&quot;, is counted under Other / General.
        </p>
      </section>

      {/* ========================================
          WAITING FOR VERIFICATION
          ======================================== */}
      {pending.length > 0 ? (
        <section id="donations-waiting" className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-ink-900">
                Waiting to be checked ({pending.length})
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                Confirm that the money really arrived before counting it. A rejection needs a reason.
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-4">
            {pending.slice(0, 20).map((donation) => (
              <li
                key={donation.id}
                id={`donation-${donation.id}`}
                className="scroll-mt-24 rounded-card border border-ink-200 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{donation.donorName}</p>
                    <p className="text-xs text-ink-500">
                      {donation.donorEmail ?? 'no email'} · {donation.donorPhone ?? 'no phone'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-ink-900">
                      {formatMoney(donation.amount)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {withNepaliDate(donation.receivedOn)} · {typeLabel(donation.donationType)}
                    </p>
                  </div>
                </div>

                {donation.purpose ? (
                  <p className="mt-2 text-sm text-ink-600">Purpose: {donation.purpose}</p>
                ) : null}
                {donation.reference ? (
                  <p className="mt-1 text-sm text-ink-600">Reference: {donation.reference}</p>
                ) : null}
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                  <span>
                    Donation reference <span className="font-mono">{donation.id}</span>
                  </span>
                  <Link
                    href={`/admin/donations/${donation.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    Open full record
                  </Link>
                </p>

                {/* The picture the donor attached. It opens through the guarded
                    /api/files/... route, so only a signed-in administrator can
                    read it - the file itself is never public. */}
                {donation.receiptUrl ? (
                  <a
                    href={donation.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-card border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    View receipt
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-ink-500">No receipt was attached.</p>
                )}

                {donation.status === 'INFO_REQUIRED' ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    A question was sent - waiting for the donor&apos;s answer
                  </p>
                ) : null}

                <DonationDecisionPanel donationId={donation.id} donorName={donation.donorName} />

                {/* Correcting a typo, or removing a test record, is allowed at any
                    stage - including after approval. See DonationQuickActions. */}
                <DonationQuickActions
                  donation={{
                    id: donation.id,
                    donorName: donation.donorName,
                    donorEmail: donation.donorEmail,
                    donorPhone: donation.donorPhone,
                    amount: donation.amount,
                    method: donation.method,
                    purpose: donation.purpose,
                    reference: donation.reference,
                    remarks: donation.remarks,
                    receivedOn: donation.receivedOn.toISOString(),
                    hasReceipt: Boolean(donation.receiptUrl),
                  }}
                />
              </li>
            ))}
          </ul>

          {pending.length > 20 ? (
            <p className="mt-4 text-xs text-ink-500">
              Showing the first 20. The rest are in the table below - filter it by “Pending”.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="card p-5">
          <h2 className="font-display text-base font-bold text-ink-900">Nothing is waiting</h2>
          <p className="mt-2 text-sm text-ink-600">
            Every donation has been checked. New donations appear here the moment they are recorded as
            pending.
          </p>
        </section>
      )}

      {/* ========================================
          ALREADY APPROVED - still editable, still removable
          ======================================== */}
      {verified.length > 0 ? (
        <section id="donations-approved" className="card p-5">
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">
              Approved donations ({verified.length})
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              A mistake can still be corrected after approval, and a test record can still be removed.
              Removing one takes it out of every total - the history is kept, never destroyed.
            </p>
          </div>

          <ul className="mt-4 space-y-4">
            {verified.slice(0, 10).map((donation) => (
              <li
                key={donation.id}
                id={`donation-${donation.id}`}
                className="scroll-mt-24 rounded-card border border-ink-200 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{donation.donorName}</p>
                    <p className="text-xs text-ink-500">
                      {donation.donorEmail ?? 'no email'} · {donation.donorPhone ?? 'no phone'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-green-700">
                      {formatMoney(donation.amount)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {withNepaliDate(donation.receivedOn)} · {typeLabel(donation.donationType)}
                    </p>
                  </div>
                </div>

                {donation.purpose ? (
                  <p className="mt-2 text-sm text-ink-600">Purpose: {donation.purpose}</p>
                ) : null}
                {donation.reference ? (
                  <p className="mt-1 text-sm text-ink-600">Reference: {donation.reference}</p>
                ) : null}
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                  <span>
                    Donation reference <span className="font-mono">{donation.id}</span>
                  </span>
                  <Link
                    href={`/admin/donations/${donation.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    Open full record
                  </Link>
                </p>

                {donation.receiptUrl ? (
                  <a
                    href={donation.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-card border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    View receipt
                  </a>
                ) : null}

                <DonationQuickActions
                  donation={{
                    id: donation.id,
                    donorName: donation.donorName,
                    donorEmail: donation.donorEmail,
                    donorPhone: donation.donorPhone,
                    amount: donation.amount,
                    method: donation.method,
                    purpose: donation.purpose,
                    reference: donation.reference,
                    remarks: donation.remarks,
                    receivedOn: donation.receivedOn.toISOString(),
                    hasReceipt: Boolean(donation.receiptUrl),
                  }}
                />
              </li>
            ))}
          </ul>

          {verified.length > 10 ? (
            <p className="mt-4 text-xs text-ink-500">
              Showing the 10 most recent. Everything else is in the table below - filter it by
              “Verified”.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ========================================
          THE RECORDS TABLE
          ======================================== */}
      <div id="donation-records">
        <ResourceManager
          resourceKey="donations"
          entityLabel="Donation"
          title="All donation records"
          description="Search by donor name, email or phone, receipt reference, purpose or remarks. Editing and removing keep the history: a removed row is hidden, never destroyed."
          fields={FIELDS}
          columns={COLUMNS}
          statusOptions={DONATION_STATUS_OPTIONS}
          statusField="status"
        />
      </div>

      <p className="text-xs text-ink-500">
        Member contributions are on{' '}
        <Link href="/admin/fund/collections" className="font-semibold text-brand-700 hover:underline">
          Monthly fund records
        </Link>
        , and money lent to members is on{' '}
        <Link href="/admin/loans" className="font-semibold text-brand-700 hover:underline">
          Loan management
        </Link>
        . The three are kept apart on purpose.
      </p>
    </div>
  );
}
