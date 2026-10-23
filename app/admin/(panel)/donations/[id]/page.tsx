import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - ONE DONATION, IN FULL
// ========================================
// Address: /admin/donations/<donation id>
//
// WHY A PAGE OF ITS OWN
//   The record list is good at scanning many gifts. It is the wrong place to
//   decide about one. This page puts everything the office needs on a single
//   screen:
//
//     who gave, how to reach them, what they wanted it used for, how much,
//     how it arrived, the transaction number they typed, the receipt picture,
//     when it was submitted, who checked it and when, and any remarks.
//
//   The Verify / Reject / Need more info buttons and the Edit / Delete buttons
//   live here too, so a decision never has to be made from a row in a table.
//
// THE RECEIPT
//   Opened through the guarded /api/files/... route, so only a signed-in
//   administrator can read it. The image is never public.
//
// THE MONEY RULE IS UNCHANGED
//   Nothing on this page marks a donation as received. That only happens when the
//   office presses Verify, which goes through its own route and records who did
//   it and when.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { DonationDecisionPanel } from '@/components/admin/DonationDecisionPanel';
import { DonationQuickActions } from '@/components/admin/DonationQuickActions';
import { DonationPermanentDelete } from '@/components/admin/DonationPermanentDelete';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { DONATION_METHOD_OPTIONS, DONATION_STATUS_OPTIONS, DONATION_TYPE_OPTIONS } from '@/lib/donation/schemas';
import { formatMoney } from '@/lib/fund/calc';
import { formatDate, formatDateTime } from '@/lib/utils';
import { withNepaliDate } from '@/lib/nepali-date';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.donationRecord'), robots: { index: false, follow: false } };
}

function labelOf(options: { value: string; label: string }[], value: string | null | undefined): string {
  return options.find((option) => option.value === String(value ?? ''))?.label ?? String(value ?? '-');
}

export default async function AdminDonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return (
      <Alert tone="warning">
        The website database has not been connected yet, so this record cannot be shown.
      </Alert>
    );
  }

  const donation = await prisma.donation.findUnique({ where: { id } }).catch(() => null);

  if (!donation) notFound();

  // Who checked it. Kept as a separate lookup because Donation stores the
  // administrator's id only - there is no relation to join through.
  const checkedBy = donation.verifiedById
    ? await prisma.user
        .findUnique({ where: { id: donation.verifiedById }, select: { name: true } })
        .catch(() => null)
    : null;

  // ---------- the donor's own account, and everything they have given ----------
  // A donation is only trustworthy if it belongs to somebody who exists. This is
  // the one place the office can see that in full: the account, when it was
  // opened, whether the email was proven, and how much has come from it.
  const donorAccount = donation.donorAccountId
    ? await prisma.donorAccount
        .findUnique({
          where: { id: donation.donorAccountId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            emailVerifiedAt: true,
            lastLoginAt: true,
            isActive: true,
          },
        })
        .catch(() => null)
    : null;

  const donorTotals = donorAccount
    ? await prisma.donation
        .aggregate({
          where: { donorAccountId: donorAccount.id, isDeleted: false },
          _count: { _all: true },
          _sum: { amount: true },
        })
        .catch(() => null)
    : null;

  const donorApproved = donorAccount
    ? await prisma.donation
        .aggregate({
          where: { donorAccountId: donorAccount.id, isDeleted: false, status: 'VERIFIED' },
          _sum: { amount: true },
        })
        .catch(() => null)
    : null;

  const statusLabel = labelOf(DONATION_STATUS_OPTIONS, donation.status);
  const methodLabel = labelOf(DONATION_METHOD_OPTIONS, donation.method);
  const typeLabel = labelOf(DONATION_TYPE_OPTIONS, donation.donationType);

  const waiting = donation.status === 'PENDING' || donation.status === 'INFO_REQUIRED';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/donations"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand-700"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Back to donation records
        </Link>

        {donation.isDeleted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            <Icon name="trash" className="h-3.5 w-3.5" />
            Removed from the totals
          </span>
        ) : null}
      </div>

      <SectionHeading
        eyebrow="Donation"
        icon="heart"
        title={donation.donorName}
        description={`${formatMoney(donation.amount)} · ${donation.purpose ?? 'General donation'}`}
      />

      {donation.isDeleted ? (
        <Alert tone="warning">
          This donation has been removed: it counts in no total and appears in no report. The record
          itself is kept so the history stays explainable, and it can be restored.
        </Alert>
      ) : null}

      {/* ========================================
          THE FACTS
          ======================================== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-ink-900">The donation</h2>

          <dl className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Amount</dt>
              <dd className="font-display text-lg font-bold text-ink-900">
                {formatMoney(donation.amount)} {donation.currency}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Status</dt>
              <dd className="text-ink-800">{statusLabel}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Purpose</dt>
              <dd className="text-ink-800">{donation.purpose ?? 'General donation'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Type</dt>
              <dd className="text-ink-800">{typeLabel}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                How it arrived
              </dt>
              <dd className="text-ink-800">{methodLabel}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Transaction number
              </dt>
              <dd className="font-mono text-ink-800">{donation.reference ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Date received
              </dt>
              <dd className="text-ink-800">{withNepaliDate(donation.receivedOn)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Submitted / recorded
              </dt>
              <dd className="text-ink-800">{withNepaliDate(donation.createdAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Donation reference
              </dt>
              <dd className="break-all font-mono text-xs text-ink-700">{donation.id}</dd>
            </div>
          </dl>

          {donation.remarks ? (
            <div className="mt-4 rounded-card border border-ink-200 bg-ink-50/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Remarks</p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{donation.remarks}</p>
            </div>
          ) : null}

          {donation.note ? (
            <div className="mt-3 rounded-card border border-ink-200 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Message from the donor
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{donation.note}</p>
            </div>
          ) : null}
        </section>

        {/* ---------- who gave ---------- */}
        <section className="card p-5">
          <h2 className="text-sm font-bold text-ink-900">The donor</h2>

          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Name</dt>
              <dd className="text-ink-800">{donation.donorName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Email</dt>
              <dd className="break-all text-ink-800">{donation.donorEmail ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Mobile</dt>
              <dd className="text-ink-800">{donation.donorPhone ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Donor account
              </dt>
              <dd className="text-ink-800">
                {donorAccount ? (
                  <>
                    <span className="block font-semibold">{donorAccount.name}</span>
                    <span className="block break-all text-xs text-ink-600">{donorAccount.email}</span>
                    <span className="mt-1 block text-[11px] text-ink-500">
                      Opened {withNepaliDate(donorAccount.createdAt)}
                      {donorAccount.emailVerifiedAt ? ' · email confirmed' : ' · email NOT confirmed'}
                      {donorAccount.isActive ? '' : ' · account switched off'}
                    </span>
                    {donorTotals ? (
                      <span className="mt-1 block text-[11px] text-ink-500">
                        {donorTotals._count._all} donation{donorTotals._count._all === 1 ? '' : 's'} ·{' '}
                        {formatMoney(donorTotals._sum.amount ?? 0)} given ·{' '}
                        {formatMoney(donorApproved?._sum.amount ?? 0)} approved
                      </span>
                    ) : null}
                  </>
                ) : (
                  'Not linked to a donor account'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Added by
              </dt>
              <dd className="text-ink-800">{donation.recordedBy ?? 'Donor, on the website'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Checked by
              </dt>
              <dd className="text-ink-800">
                {checkedBy?.name ?? '-'}
                {donation.verifiedAt ? ` · ${withNepaliDate(donation.verifiedAt)}` : ''}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* ========================================
          THE RECEIPT
          ======================================== */}
      <section className="card p-5">
        <h2 className="text-sm font-bold text-ink-900">Payment receipt</h2>

        {donation.receiptUrl ? (
          <>
            <p className="mt-1 text-xs text-ink-500">
              Private: this picture opens only for a signed-in administrator.
            </p>

            <div className="mt-3 flex flex-wrap items-start gap-5">
              <div className="w-48 overflow-hidden rounded-card bg-white ring-1 ring-ink-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={donation.receiptUrl}
                  alt="The payment receipt the donor attached"
                  className="w-full"
                />
              </div>

              <a
                href={donation.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <Icon name="external-link" className="h-4 w-4" />
                Open the full size
              </a>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-600">
            No receipt was attached. For a bank or eSewa transfer, ask the donor for a screenshot before
            approving this donation.
          </p>
        )}
      </section>

      {/* ========================================
          WHAT CAN BE DONE
          ======================================== */}
      {waiting && !donation.isDeleted ? (
        <section className="card p-5">
          <h2 className="text-sm font-bold text-ink-900">Check this payment</h2>
          <p className="mt-1 text-xs text-ink-500">
            Confirm the money really arrived in the club's account before pressing Verify. A rejection
            and a request for information both need a written reason.
          </p>

          <DonationDecisionPanel donationId={donation.id} donorName={donation.donorName} />
        </section>
      ) : null}

      <section className="card p-5">
        <h2 className="text-sm font-bold text-ink-900">Change this record</h2>
        <p className="mt-1 text-xs text-ink-500">
          Corrections are allowed at any stage, including after approval. Removing a donation takes it
          out of every total; the history is kept and it can be restored.
        </p>

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
      </section>

      {/* ========================================
          THE LAST RESORT
          ======================================== */}
      <section className="card border-red-200 p-5">
        <h2 className="text-sm font-bold text-red-800">Delete permanently</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">
          For a test entry, a duplicate, or a donation typed by mistake. The record is destroyed, not
          hidden - the ordinary Delete is still the right choice for anything else. The activity log
          keeps a line saying what was removed and by whom.
        </p>

        <div className="mt-3">
          <DonationPermanentDelete
            variant="button"
            donation={{
              id: donation.id,
              donorName: donation.donorName,
              amount: donation.amount,
              purpose: donation.purpose,
              receivedOn: donation.receivedOn.toISOString(),
              status: donation.status,
              hasReceipt: Boolean(donation.receiptUrl),
            }}
          />
        </div>
      </section>
    </div>
  );
}
