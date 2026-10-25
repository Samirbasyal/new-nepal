// ========================================
// DONOR DASHBOARD - MY DONATIONS
// ========================================
// Address: /donor/dashboard   (sign-in required, email confirmed required)
//
// WHAT THIS IS
//   The donor's own receipt book: every donation they made while signed in, what
//   it was for, how it was paid, what the office has decided, and the totals.
//
// WHO CAN SEE WHAT - AND WHY IT CANNOT BE TAMPERED WITH
//   There is no id in the address. The account comes from the signed cookie, is
//   re-checked against the database on every request (lib/donor/session.ts), and
//   the query filters on donorAccountId = that account. Changing a URL or a
//   parameter therefore changes nothing: the server never reads which donor to
//   show from the request.
//
//   A page-level check alone would not be enough either - the filtering happens
//   in the query itself, so a mistake in the layout cannot leak another person's
//   rows.
//
// WHAT IS NOT SHOWN
//   The uploaded receipt image. It is a private financial document and stays in
//   the Admin Panel.
//
// THE MONEY RULE
//   Only VERIFIED donations count as approved. Pending, rejected and unfinished
//   rows are listed but never added to the approved total - the same rule the
//   Admin Panel and the finance pages use.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHero, Section, SectionHeading } from '@/components/ui/Section';
import { DonorLogoutButton } from '@/components/donor/DonorLogoutButton';
import { DonationApprovedBanner } from '@/components/donor/DonationApprovedBanner';
import { requireDonor } from '@/lib/donor/session';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { DONATION_METHOD_OPTIONS } from '@/lib/donation/schemas';
import { formatMoney } from '@/lib/fund/calc';
import { withNepaliDate, withNepaliDateTime } from '@/lib/nepali-date';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My donations',
  robots: { index: false, follow: false },
};

/** How each status is worded for the donor, and its colour. */
const STATUS: Record<string, { label: string; className: string; icon: IconName }> = {
  INITIATED: { label: 'Not paid yet', className: 'bg-ink-100 text-ink-700', icon: 'clock' },
  PENDING: { label: 'Waiting for the office', className: 'bg-amber-50 text-amber-800', icon: 'clock' },
  INFO_REQUIRED: {
    label: 'The office needs something from you',
    className: 'bg-amber-50 text-amber-800',
    icon: 'mail',
  },
  VERIFIED: { label: 'Approved - thank you', className: 'bg-green-50 text-green-800', icon: 'check-circle' },
  REJECTED: { label: 'Not accepted', className: 'bg-red-50 text-red-800', icon: 'close' },
};

function methodLabel(value: string): string {
  return DONATION_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default async function DonorDashboardPage() {
  const donor = await requireDonor('/donor/dashboard');

  const rows = isDatabaseConfigured()
    ? await prisma.donation
        .findMany({
          where: { donorAccountId: donor.id, isDeleted: false },
          orderBy: { receivedOn: 'desc' },
          take: 200,
          select: {
            id: true,
            amount: true,
            purpose: true,
            method: true,
            status: true,
            reference: true,
            note: true,
            remarks: true,
            receivedOn: true,
            createdAt: true,
            verifiedAt: true,
          },
        })
        .catch(() => [])
    : [];

  const approved = rows.filter((row) => row.status === 'VERIFIED');
  const waiting = rows.filter((row) => row.status === 'PENDING' || row.status === 'INFO_REQUIRED');
  const rejected = rows.filter((row) => row.status === 'REJECTED');

  // The most recently confirmed gift, if it was confirmed in the last month. This
  // is what the banner at the top of the page announces - "your donation was
  // approved". Only the last 30 days, because a confirmation from last year is not
  // news any more, and a banner nobody can remember creating is just noise.
  const justApproved = rows
    .filter(
      (row) =>
        row.status === 'VERIFIED' &&
        row.verifiedAt !== null &&
        Date.now() - new Date(row.verifiedAt).getTime() < 30 * 24 * 60 * 60 * 1000,
    )
    .sort((a, b) => new Date(b.verifiedAt as Date).getTime() - new Date(a.verifiedAt as Date).getTime())[0];

  const approvedTotal = approved.reduce((sum, row) => sum + row.amount, 0);
  const waitingTotal = waiting.reduce((sum, row) => sum + row.amount, 0);

  // "Total donated" = everything that is still real money: approved plus what is
  // being checked. Rejected rows are shown but never counted, because the office
  // has decided that money did not arrive.
  const givenTotal = approvedTotal + waitingTotal;

  return (
    <>
      <PageHero
        eyebrow="Donor dashboard"
        icon="heart"
        title={`Welcome, ${donor.name.split(' ')[0]}`}
        description="Your own record of giving - what you gave, which cause it supported, and what the office has confirmed."
      />

      <Section>
        <div className="mx-auto max-w-4xl">
          {/* ---------- account line ---------- */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm text-ink-600">
                Signed in as <span className="font-semibold text-ink-900">{donor.email}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                  <Icon name="check-circle" className="h-3 w-3" />
                  Email confirmed
                </span>
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                This is a donor account only - it does not open the member or administrator panel.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/donate/start" variant="primary" className="btn-sm">
                <Icon name="heart" className="h-4 w-4" />
                Donate again
              </ButtonLink>
              <DonorLogoutButton />
            </div>
          </div>

          {/* ---------- the good news, if there is any ---------- */}
          {justApproved ? (
            <DonationApprovedBanner
              donation={{
                id: justApproved.id,
                amount: formatMoney(justApproved.amount),
                purpose: justApproved.purpose ?? 'a general donation',
                when: withNepaliDateTime(justApproved.verifiedAt),
              }}
            />
          ) : null}

          {/* ---------- totals ---------- */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Total given</p>
              <p className="mt-2 font-display text-xl font-bold text-ink-900">{formatMoney(givenTotal)}</p>
              <p className="mt-1 text-xs text-ink-500">
                {rows.length} donation{rows.length === 1 ? '' : 's'} in total
              </p>
            </div>

            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Approved by the office
              </p>
              <p className="mt-2 font-display text-xl font-bold text-green-700">
                {formatMoney(approvedTotal)}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {approved.length} confirmed donation{approved.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Waiting</p>
              <p className="mt-2 font-display text-xl font-bold text-amber-700">{formatMoney(waitingTotal)}</p>
              <p className="mt-1 text-xs text-ink-500">
                {waiting.length === 0 ? 'Nothing is waiting' : `${waiting.length} not confirmed yet`}
              </p>
            </div>
          </div>

          {/* ---------- the history ---------- */}
          <div className="mt-8">
            <SectionHeading title="Donation history" eyebrow="History" icon="file-text" />

            {rows.length === 0 ? (
              <div className="card mt-4 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon name="heart" className="h-6 w-6" />
                </div>

                <h2 className="mt-3 text-base font-bold text-ink-900">No donations yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
                  Every donation you make while signed in is saved here, with its purpose and whether the
                  office has confirmed it.
                </p>

                <div className="mt-4 flex justify-center">
                  <ButtonLink href="/donate/start" variant="primary">
                    <Icon name="heart" className="h-4 w-4" />
                    Make your first donation
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {rows.map((row) => {
                  const state = STATUS[row.status] ?? {
                    label: row.status,
                    className: 'bg-ink-100 text-ink-700',
                    icon: 'info' as IconName,
                  };

                  return (
                    <li key={row.id} className="card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-lg font-bold text-ink-900">
                            {formatMoney(row.amount)}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-700">
                            {row.purpose ?? 'General donation'}
                          </p>
                          <p className="mt-1 text-xs text-ink-500">
                            {withNepaliDateTime(row.createdAt)} · {methodLabel(row.method)}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            Money received {withNepaliDate(row.receivedOn)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${state.className}`}
                          >
                            <Icon name={state.icon} className="h-3.5 w-3.5" />
                            {state.label}
                          </span>

                          <div className="mt-2">
                            <Link
                              href={`/donate/submitted/${row.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                            >
                              Full details
                              <Icon name="arrow-right" className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] text-ink-400">
                        Reference <span className="font-mono">{row.id}</span>
                        {row.reference ? (
                          <>
                            {' '}
                            · payment reference <span className="font-mono">{row.reference}</span>
                          </>
                        ) : null}
                      </p>

                      {/* ---------- what the office said ---------- */}
                      {row.verifiedAt && row.status === 'VERIFIED' ? (
                        <p className="mt-2 rounded-card bg-green-50/70 px-3 py-2 text-xs text-green-900">
                          Confirmed by the office on {withNepaliDateTime(row.verifiedAt)}.
                        </p>
                      ) : null}

                      {row.remarks ? (
                        <p className="mt-2 rounded-card bg-ink-50 px-3 py-2 text-xs text-ink-700">
                          <span className="font-semibold">Note from the office:</span> {row.remarks}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {rejected.length > 0 ? (
            <div className="mt-6">
              <Alert tone="warning">
                {rejected.length} donation{rejected.length === 1 ? ' was' : 's were'} not accepted. They
                stay in the list above for your records, but they are not counted in the totals. Please
                contact the office with the reference if you think that is wrong.
              </Alert>
            </div>
          ) : null}

          {rows.length > 0 ? (
            <p className="mt-6 text-xs text-ink-500">
              Only a donation the office has confirmed counts as approved. A payment you have submitted
              stays in &quot;Waiting&quot; until it has been checked against the club&apos;s account.
            </p>
          ) : null}
        </div>
      </Section>
    </>
  );
}
