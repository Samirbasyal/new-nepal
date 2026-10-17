// ========================================
// DONATE - WHAT THE DONOR SEES AFTER SUBMITTING
// ========================================
// Address: /donate/submitted/<reference>
//
// ONE PAGE, FOUR POSSIBLE ANSWERS
//   INITIATED       started, but nothing submitted yet
//   PENDING         submitted - waiting for the office to check it
//   VERIFIED        checked and approved
//   REJECTED        checked and not accepted
//   INFO_REQUIRED   the office needs something from the donor
//
// HONESTY RULES FOLLOWED HERE
//   - It never says "payment received". Only an administrator's approval makes a
//     donation successful, and this page simply reports what the database says.
//   - It never claims an email or SMS was sent. No message is sent from here, so
//     saying otherwise would be untrue.
//   - 24 hours is described as the usual review time, not a promise.
//
// PRIVACY
//   The address is the donation's own cuid. It is unguessable, so a stranger
//   cannot walk the list of references. Nothing about other donors is shown.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { PUBLIC_PAYMENT_METHODS } from '@/lib/donation/publicSchemas';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { formatDateTime, formatMoney } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your donation',
  robots: { index: false, follow: false },
};

/** The usual review time. Shown as expected, never as guaranteed. */
const REVIEW_HOURS = 24;

const STATUS: Record<string, { label: string; tone: 'ok' | 'pending' | 'bad' | 'info' }> = {
  INITIATED: { label: 'Not submitted yet', tone: 'info' },
  PENDING: { label: 'Pending Approval', tone: 'pending' },
  VERIFIED: { label: 'Payment Successful', tone: 'ok' },
  REJECTED: { label: 'Not approved', tone: 'bad' },
  INFO_REQUIRED: { label: 'Additional information required', tone: 'info' },
};

const TONE_CLASS: Record<string, string> = {
  ok: 'border-brand-300 bg-brand-50/70',
  pending: 'border-accent-300 bg-accent-50/70',
  bad: 'border-red-200 bg-red-50/70',
  info: 'border-ink-200 bg-ink-50/70',
};

export default async function DonateSubmittedPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  if (!isDatabaseConfigured()) {
    return (
      <Section>
        <p className="text-sm text-ink-600">The website database has not been connected yet.</p>
      </Section>
    );
  }

  const donation = await prisma.donation
    .findFirst({
      where: { id: ref, isDeleted: false },
      select: {
        id: true,
        status: true,
        donorName: true,
        donorEmail: true,
        donorPhone: true,
        purpose: true,
        amount: true,
        method: true,
        reference: true,
        remarks: true,
        receivedOn: true,
        verifiedAt: true,
        createdAt: true,
      },
    })
    .catch(() => null);

  if (!donation) notFound();

  const status = STATUS[donation.status] ?? { label: donation.status, tone: 'info' as const };
  const methodLabel =
    PUBLIC_PAYMENT_METHODS.find((option) => option.value === donation.method)?.label ??
    donation.method;

  const waitingHours = Math.floor((Date.now() - donation.receivedOn.getTime()) / 3_600_000);
  const overdue = donation.status === 'PENDING' && waitingHours >= REVIEW_HOURS;

  return (
    <>
      <PageHero
        eyebrow="Donation"
        icon={donation.status === 'VERIFIED' ? 'check-circle' : 'heart'}
        title={
          donation.status === 'PENDING'
            ? 'Payment Verification Pending'
            : donation.status === 'VERIFIED'
              ? 'Payment Successful - Thank You!'
              : status.label
        }
        description={
          donation.status === 'PENDING'
            ? 'We have your submission. Our Admin team will check it and confirm your payment.'
            : donation.status === 'VERIFIED'
              ? 'Your donation has been verified. Thank you for your kindness.'
              : 'Here is the latest state of your donation.'
        }
      />

      <Section>
        <div className="mx-auto max-w-3xl space-y-6">
          {/* ========================================
              THE MESSAGE FOR THIS STATE
              ======================================== */}
          <div className={`card p-6 ${TONE_CLASS[status.tone] ?? ''}`}>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 ring-1 ring-ink-200">
                <Icon
                  name={
                    donation.status === 'VERIFIED'
                      ? 'check-circle'
                      : donation.status === 'REJECTED'
                        ? 'alert'
                        : 'clock'
                  }
                  className="h-5 w-5"
                />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900">{status.label}</p>

                {donation.status === 'PENDING' ? (
                  <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-700">
                    <p>
                      Thank you for your generous support of Janakalyan Samata Yuwa Club!
                    </p>
                    <p>
                      We have received your donation submission. Your payment is currently pending
                      verification by our Admin team.
                    </p>
                    <p>
                      Please allow up to {REVIEW_HOURS} hours for verification. This is the usual
                      review time, not a guarantee - if the office needs longer, they will contact
                      you using the email address or mobile number you provided.
                    </p>
                    <p>
                      Your donation will be marked as successful only after the payment has been
                      verified and approved.
                    </p>
                    <p>Thank you for your kindness, trust, and valuable contribution to our community.</p>
                  </div>
                ) : null}

                {donation.status === 'VERIFIED' ? (
                  <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-700">
                    <p>Your donation has been verified successfully!</p>
                    <p>
                      Thank you for your kindness and generous contribution to Janakalyan Samata Yuwa
                      Club. Your support helps us continue our community service and assist people who
                      need help.
                    </p>
                    <p>
                      We sincerely appreciate your trust and generosity. Together, we can make a
                      positive difference in our community.
                    </p>
                  </div>
                ) : null}

                {donation.status === 'REJECTED' ? (
                  <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-700">
                    <p>
                      This donation could not be confirmed against the payment records, so it has not
                      been marked successful.
                    </p>
                    {donation.remarks ? <p>Note from the office: {donation.remarks}</p> : null}
                    <p>
                      If you believe this is a mistake, please contact the office with your reference
                      number and transaction ID.
                    </p>
                  </div>
                ) : null}

                {donation.status === 'INFO_REQUIRED' ? (
                  <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-700">
                    <p>The office needs a little more information before this payment can be checked.</p>
                    {donation.remarks ? <p>Message from the office: {donation.remarks}</p> : null}
                  </div>
                ) : null}

                {donation.status === 'INITIATED' ? (
                  <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-700">
                    <p>
                      This donation was started but the payment was never submitted, so nothing has
                      been charged and nothing is waiting for verification.
                    </p>
                    <Link
                      href={`/donate/pay/${donation.id}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
                    >
                      Finish this donation
                      <Icon name="chevron-right" className="h-4 w-4" />
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ---------- Delayed, but still pending ---------- */}
          {overdue ? (
            <div className="card border-accent-300 bg-accent-50/60 p-5">
              <p className="text-sm font-bold text-ink-900">Taking longer than usual</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-700">
                It has been more than {REVIEW_HOURS} hours and this donation is still waiting for
                verification. Nothing has gone wrong with your money - the office has simply not
                recorded the confirmation yet. Please contact the office with your reference number
                below and they will look into it.
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
              >
                <Icon name="mail" className="h-4 w-4" />
                Contact the office
              </Link>
            </div>
          ) : null}

          {/* ========================================
              THE DETAILS
              ======================================== */}
          <div className="card p-6">
            <h2 className="text-base font-bold text-ink-900">Your donation</h2>

            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Reference number
                </dt>
                <dd className="font-mono text-xs text-ink-800">{donation.id}</dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Status
                </dt>
                <dd className="font-semibold text-ink-900">{status.label}</dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Amount
                </dt>
                <dd className="text-ink-800">
                  {donation.amount > 0 ? formatMoney(donation.amount) : 'Not entered yet'}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Cause
                </dt>
                <dd className="text-ink-800">{donation.purpose ?? 'General donation'}</dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Payment method
                </dt>
                <dd className="text-ink-800">{donation.status === 'INITIATED' ? '-' : methodLabel}</dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Submitted
                </dt>
                <dd className="text-ink-800">
                  {donation.status === 'INITIATED'
                    ? 'Not submitted yet'
                    : formatDateTime(donation.receivedOn)}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Donor
                </dt>
                <dd className="text-ink-800">{donation.donorName}</dd>
              </div>

              {donation.verifiedAt ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Verified on
                  </dt>
                  <dd className="text-ink-800">{formatDateTime(donation.verifiedAt)}</dd>
                </div>
              ) : null}
            </dl>

            <p className="mt-5 border-t border-ink-200 pt-4 text-xs leading-relaxed text-ink-500">
              Keep this reference number. Anyone with the full link can see this page, so please do not
              post it publicly. No other donor&apos;s information is ever shown here.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/donate/status"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <Icon name="search" className="h-4 w-4" />
              Check another donation
            </Link>

            <Link
              href="/donate"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand-700"
            >
              <Icon name="heart" className="h-4 w-4" />
              Back to Donate
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
