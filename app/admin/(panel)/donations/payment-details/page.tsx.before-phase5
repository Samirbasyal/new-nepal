// ========================================
// ADMIN PANEL - BANK, QR AND eSEWA DETAILS
// ========================================
// Address: /admin/donations/payment-details
//
// WHAT THIS SCREEN IS
//   The place where the office publishes where a donor should send money. Whatever
//   is saved here is exactly what the payment page shows - nothing is generated,
//   and no QR code is drawn by the website itself.
//
// WHY IT IS NOT PART OF THE RECORD LIST
//   Editing a donor's record and changing the club's bank account are very
//   different actions. Keeping them on separate screens means a small correction
//   to a donation can never move the club's money.
//
// WHO MAY USE IT
//   Any administrator (the panel layout checks it) - the same people who confirm
//   donations. The API checks the role again before saving.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { DonationPaymentSettingsForm } from '@/components/admin/DonationPaymentSettingsForm';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bank and QR details',
  robots: { index: false, follow: false },
};

export default async function DonationPaymentDetailsPage() {
  const settings = await getSettings();

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
        icon="qr-code"
        title="Bank, QR and eSewa details"
        description="Where a donor sends the money. These details are public - they appear on the payment page after the donor has entered an amount and chosen a method."
      />

      <Alert tone="info">
        A method is offered to a donor only while its details are filled in here. Leave eSewa empty to
        hide it; remove the QR picture to show the account number only. Nothing is ever invented for
        you.
      </Alert>

      <DonationPaymentSettingsForm
        initial={{
          'donate.bankName': settings['donate.bankName'] ?? '',
          'donate.bankAccountName': settings['donate.bankAccountName'] ?? '',
          'donate.bankAccountNumber': settings['donate.bankAccountNumber'] ?? '',
          'donate.bankBranch': settings['donate.bankBranch'] ?? '',
          'donate.qrImageUrl': settings['donate.qrImageUrl'] ?? '',
          'donate.esewaId': settings['donate.esewaId'] ?? '',
          'donate.esewaName': settings['donate.esewaName'] ?? '',
          'donate.paymentNote': settings['donate.paymentNote'] ?? '',
        }}
      />
    </div>
  );
}
