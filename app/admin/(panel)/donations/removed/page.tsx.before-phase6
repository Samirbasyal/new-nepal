// ========================================
// ADMIN PANEL - REMOVED DONATIONS
// ========================================
// Address: /admin/donations/removed
//
// WHY A SCREEN FOR SOMETHING THAT IS "DELETED"
//   Removing a donation never destroys it - the row is marked isDeleted and drops
//   out of every total. That is what keeps the books explainable, and it is also
//   what makes a mistake recoverable. Without this page, a removal would be
//   invisible: the record would exist, count nowhere, and nobody could tell
//   whether it had ever been entered.
//
// WHAT IT SHOWS
//   Every removed donation with its amount, donor, purpose and the date it was
//   received, plus a Restore button that puts it straight back into the totals
//   exactly as it was.
//
// IT DOES NOT COUNT ANYTHING
//   These rows are not income. They are only a list of what was taken out.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { DonationRestoreButton } from '@/components/admin/DonationRestoreButton';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/fund/calc';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Removed donations',
  robots: { index: false, follow: false },
};

export default async function RemovedDonationsPage() {
  const rows = isDatabaseConfigured()
    ? await prisma.donation
        .findMany({
          where: { isDeleted: true },
          orderBy: { updatedAt: 'desc' },
          take: 300,
          select: {
            id: true,
            donorName: true,
            donorEmail: true,
            amount: true,
            purpose: true,
            status: true,
            receivedOn: true,
            updatedAt: true,
          },
        })
        .catch(() => [])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/donations"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand-700"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Back to donation records
        </Link>
      </div>

      <SectionHeading
        eyebrow="Donations"
        icon="trash"
        title="Removed donations"
        description="Records that have been taken out of the totals. Nothing here counts as income, and anything here can be put back."
      />

      {rows.length === 0 ? (
        <div className="card p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
            <Icon name="check-circle" className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-ink-900">Nothing has been removed</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
            Every donation ever recorded is still in the list. Removed records would appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{row.donorName}</p>
                  <p className="text-xs text-ink-500">
                    {row.donorEmail ?? 'no email'} · received {formatDate(row.receivedOn)}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">{row.purpose ?? 'General donation'}</p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    Reference <span className="font-mono">{row.id}</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-display text-lg font-bold text-ink-700">
                    {formatMoney(row.amount)}
                  </p>
                  <p className="text-xs text-ink-500">was {row.status.toLowerCase()}</p>
                  <div className="mt-2">
                    <DonationRestoreButton donationId={row.id} donorName={row.donorName} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ink-500">
        Restoring a donation returns it to the list and to the totals with its original amount, dates
        and receipt. The action is written to the activity log.
      </p>
    </div>
  );
}
