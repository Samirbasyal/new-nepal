// ========================================
// DONOR - MY DONATIONS
// ========================================
// Address: /donor/donations   (sign-in required)
//
// WHAT THIS PAGE IS
//   The donor's own receipt book. Every donation they made while signed in, with
//   the cause, the amount, the date and whether the office has confirmed it.
//
// WHO CAN SEE WHAT
//   The query is filtered by donorAccountId = the signed-in account, so a donor
//   can only ever load their own rows. There is no id in the address to tamper
//   with - the account comes from the signed cookie, and the cookie is checked
//   against the database on every request (lib/donor/session.ts).
//
// WHAT IS NOT SHOWN
//   The uploaded receipt picture. It is a private financial document and it stays
//   inside the Admin Panel, exactly as before.
//
// THE MONEY RULES ARE UNCHANGED
//   A donation counts as received only when its status is VERIFIED - the same
//   rule the Admin Panel and the donor status page use. This page just repeats
//   that, it never decides it.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHero, Section, SectionHeading } from '@/components/ui/Section';
import { DonorLogoutButton } from '@/components/donor/DonorLogoutButton';
import { requireDonor } from '@/lib/donor/session';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { DONATION_METHOD_OPTIONS } from '@/lib/donation/schemas';
import { formatMoney } from '@/lib/fund/calc';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My donations',
  robots: { index: false, follow: false },
};

/** How each status is worded for the donor, and its colour. */
const STATUS: Record<string, { label: string; className: string; icon: IconName }> = {
  INITIATED: {
    label: 'Not paid yet',
    className: 'bg-ink-100 text-ink-700',
    icon: 'clock',
  },
  PENDING: {
    label: 'Waiting for the office',
    className: 'bg-amber-50 text-amber-800',
    icon: 'clock',
  },
  INFO_REQUIRED: {
    label: 'The office needs something from you',
    className: 'bg-amber-50 text-amber-800',
    icon: 'mail',
  },
  VERIFIED: {
    label: 'Confirmed',
    className: 'bg-green-50 text-green-800',
    icon: 'check-circle',
  },
  REJECTED: {
    label: 'Not accepted',
    className: 'bg-red-50 text-red-800',
    icon: 'close',
  },
};

function methodLabel(value: string): string {
  return DONATION_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default async function DonorDonationsPage() {
  const donor = await requireDonor();

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
            receivedOn: true,
          },
        })
        .catch(() => [])
    : [];

  const confirmed = rows.filter((row) => row.status === 'VERIFIED');
  const waiting = rows.filter((row) => row.status === 'PENDING' || row.status === 'INFO_REQUIRED');

  const confirmedTotal = confirmed.reduce((sum, row) => sum + row.amount, 0);
  const waitingTotal = waiting.reduce((sum, row) => sum + row.amount, 0);

  return (
    <>
      <PageHero
        eyebrow="Donor account"
        icon="heart"
        title={`Your donations, ${donor.name.split(' ')[0]}`}
        description="Everything you have given while signed in, and whether the office has confirmed each payment."
      />

      <Section>
        <div className="mx-auto max-w-4xl">
          {/* ---------- who is signed in ---------- */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink-600">
                Signed in as <span className="font-semibold text-ink-900">{donor.email}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                This is a donor account only - it does not open the member or administrator panel.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/donate/start" className="btn btn-primary btn-sm">
                <Icon name="heart" className="h-4 w-4" />
                Donate again
              </Link>
              <DonorLogoutButton />
            </div>
          </div>

          {/* ---------- the totals ---------- */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Confirmed</p>
              <p className="mt-2 font-display text-xl font-bold text-green-700">
                {formatMoney(confirmedTotal)}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {confirmed.length} donation{confirmed.length === 1 ? '' : 's'} checked by the office
              </p>
            </div>

            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Waiting</p>
              <p className="mt-2 font-display text-xl font-bold text-amber-700">
                {formatMoney(waitingTotal)}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {waiting.length === 0
                  ? 'Nothing is waiting'
                  : `${waiting.length} payment${waiting.length === 1 ? '' : 's'} not confirmed yet`}
              </p>
            </div>

            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">All donations</p>
              <p className="mt-2 font-display text-xl font-bold text-ink-900">{rows.length}</p>
              <p className="mt-1 text-xs text-ink-500">Every gift on this account</p>
            </div>
          </div>

          {/* ---------- the list ---------- */}
          <div className="mt-8">
            <SectionHeading title="Your donation history" eyebrow="History" icon="file-text" />

            {rows.length === 0 ? (
              <div className="card mt-4 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon name="heart" className="h-6 w-6" />
                </div>

                <h2 className="mt-3 text-base font-bold text-ink-900">No donations on this account yet</h2>

                <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
                  Donations are added here when you give while signed in. An earlier gift given without
                  an account stays anonymous, so it will not appear.
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <ButtonLink href="/donate/start" variant="primary">
                    <Icon name="heart" className="h-4 w-4" />
                    Make a donation
                  </ButtonLink>
                  <ButtonLink href="/donate/status" variant="outline">
                    <Icon name="search" className="h-4 w-4" />
                    Look up one reference
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
                            {formatDate(row.receivedOn)} · {methodLabel(row.method)}
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
                            · transaction <span className="font-mono">{row.reference}</span>
                          </>
                        ) : null}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {rows.length > 0 ? (
            <div className="mt-6">
              <Alert tone="info">
                Something looks wrong, or an old donation is missing? Contact the office with the
                donation reference and they will find it. Only a payment the office has confirmed counts
                as received.
              </Alert>
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}
