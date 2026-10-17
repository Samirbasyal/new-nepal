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
import type { FieldConfig, ColumnConfig } from '@/components/admin/types';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import {
  DONATION_METHOD_OPTIONS,
  DONATION_STATUS_OPTIONS,
  DONATION_TYPE_OPTIONS,
} from '@/lib/donation/schemas';
import { formatMoney } from '@/lib/fund/calc';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Donation records',
  robots: { index: false, follow: false },
};

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
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const thisYear = new Date().getFullYear();
  const year = Number(params.year ?? thisYear) || thisYear;

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
  const pending = rows.filter((row) => row.status === 'PENDING');
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
    { name: 'receivedOn', label: 'Date received', type: 'date', required: true, section: 'What was given' },
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
    { name: 'receivedOn', label: 'Received', type: 'date' },
    { name: 'donationType', label: 'Type', hideOnMobile: true },
    { name: 'method', label: 'Method', hideOnMobile: true },
    { name: 'purpose', label: 'Purpose', type: 'longtext', hideOnMobile: true },
    { name: 'status', label: 'Status', type: 'badge' },
    { name: 'reference', label: 'Receipt no.', hideOnMobile: true },
    { name: 'remarks', label: 'Remarks', type: 'longtext', hideOnMobile: true },
    { name: 'recordedBy', label: 'Added by', hideOnMobile: true },
    { name: 'verifiedBy.name', label: 'Verified by', hideOnMobile: true },
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
              <li key={donation.id} className="rounded-card border border-ink-200 p-4">
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
                      {formatDate(donation.receivedOn)} · {typeLabel(donation.donationType)}
                    </p>
                  </div>
                </div>

                {donation.purpose ? (
                  <p className="mt-2 text-sm text-ink-600">Purpose: {donation.purpose}</p>
                ) : null}
                {donation.reference ? (
                  <p className="mt-1 text-sm text-ink-600">Reference: {donation.reference}</p>
                ) : null}

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

                <DonationDecisionPanel donationId={donation.id} donorName={donation.donorName} />
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
