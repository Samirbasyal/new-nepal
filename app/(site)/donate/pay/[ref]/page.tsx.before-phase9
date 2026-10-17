// ========================================
// DONATE - STEP 4 (the payment page)
// ========================================
// Address: /donate/pay/<reference>
//
// THE ONE PLACE THE MONEY DETAILS ARE SHOWN
//   This is the only page that prints the bank account and the QR code, and even
//   here the client component keeps them hidden until the donor has typed an
//   amount AND chosen a method. Nothing is shown on the landing page, the purpose
//   list or the details form.
//
// WHERE THEY COME FROM
//   Admin Panel -> Settings -> Donation information (keys donate.*). These are
//   the club's real, administrator-entered details. Nothing is generated, and no
//   QR is drawn locally - a made-up QR would send money nowhere.
//
// ALREADY SUBMITTED?
//   A donation that is no longer INITIATED is sent to the confirmation page
//   instead, so a donor refreshing an old link never submits the same gift twice.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { PaymentStep } from '@/components/donate/PaymentStep';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { getSettings, hasRealValue, setting } from '@/lib/settings';
import { requireDonor } from '@/lib/donor/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Complete your donation',
  robots: { index: false, follow: false },
};

export default async function DonatePayPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  if (!isDatabaseConfigured()) {
    return (
      <Section>
        <p className="text-sm text-ink-600">The website database has not been connected yet.</p>
      </Section>
    );
  }

  // ---------- only the donor who started this gift may pay it ----------
  // The reference in the address is long and unguessable, but "unguessable" is
  // not the same as "yours". The cookie decides, and the donation must belong to
  // that account - otherwise this page would let anybody who stumbled on a link
  // submit a payment against somebody else's donation.
  const donor = await requireDonor(`/donate/pay/${ref}`);

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
        donorAccountId: true,
      },
    })
    .catch(() => null);

  if (!donation) notFound();
  if (donation.donorAccountId !== donor.id) notFound();

  // Already paid, waiting, or finished - the payment form is no longer the right
  // place to be.
  if (donation.status !== 'INITIATED') {
    redirect(`/donate/submitted/${donation.id}`);
  }

  const settings = await getSettings();

  const bank = {
    bankName: setting(settings, 'donate.bankName', ''),
    accountName: setting(settings, 'donate.bankAccountName', ''),
    accountNumber: setting(settings, 'donate.bankAccountNumber', ''),
    branch: setting(settings, 'donate.bankBranch', ''),
  };

  const qrImageUrl = setting(settings, 'donate.qrImageUrl', '');
  const hasQr = hasRealValue(qrImageUrl);

  // "Bank transfer" is offered when there is either an account to transfer to or
  // a QR code to scan. A QR on its own is a real, payable method.
  const hasBankAccount = [bank.bankName, bank.accountName, bank.accountNumber, bank.branch].some(hasRealValue);
  const hasBank = hasBankAccount || hasQr;

  // eSewa is offered ONLY when an ID has been saved in the Admin Panel. An empty
  // field hides the method instead of asking the donor to send money nowhere.
  const esewa = {
    id: setting(settings, 'donate.esewaId', ''),
    name: setting(settings, 'donate.esewaName', ''),
  };
  const hasEsewa = hasRealValue(esewa.id);

  const paymentNote = setting(settings, 'donate.paymentNote', '');

  return (
    <>
      <PageHero
        eyebrow="Step 3 of 4"
        icon="banknote"
        title="Complete your donation"
        description="Enter the amount, choose how you will pay, then send us the receipt."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          {/* ---------- What was chosen, restated ---------- */}
          <div className="card p-5">
            <h2 className="text-base font-bold text-ink-900">Your donation</h2>

            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Name</dt>
                <dd className="text-ink-800">{donation.donorName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Cause
                </dt>
                <dd className="text-ink-800">{donation.purpose ?? 'General donation'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Email
                </dt>
                <dd className="break-all text-ink-800">{donation.donorEmail ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Mobile
                </dt>
                <dd className="text-ink-800">{donation.donorPhone ?? '-'}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-ink-500">
              Reference <span className="font-mono text-ink-700">{donation.id}</span>
            </p>
          </div>

          <div className="mt-6">
            <PaymentStep
              reference={donation.id}
              bank={bank}
              hasBank={hasBank}
              qrImageUrl={hasQr ? qrImageUrl : null}
              esewa={esewa}
              hasEsewa={hasEsewa}
              paymentNote={paymentNote}
            />
          </div>

          <div className="mt-10 border-t border-ink-200 pt-5">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand-700"
            >
              <Icon name="mail" className="h-4 w-4" />
              Something wrong? Contact the office
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
