// ========================================
// MEMBER PANEL - PAY MONTHLY FUND
// ========================================
// Address: /member/fund/pay
//
// This page prepares everything the form needs:
//   - the bank accounts members are allowed to pay into
//     (ANYTHING with isActive = false is hidden automatically)
//   - the monthly amount and the receipt rule from Admin Panel -> Settings
//
// The form itself is components/member/PayFundForm.tsx
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth/guards';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { readSettingValue } from '@/lib/settings';
import { monthStart } from '@/lib/fund/calc';
import { SectionHeading } from '@/components/ui/Section';
import { Icon } from '@/components/ui/Icon';
import { Alert } from '@/components/ui/Alert';
import { PayFundForm } from '@/components/member/PayFundForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pay monthly fund',
  robots: { index: false, follow: false },
};

export default async function MemberPayFundPage() {
  await requireMember();

  if (!isDatabaseConfigured()) {
    return <Alert tone="warning" title="The database is not set up yet" />;
  }

  const [banks, monthlyAmountText, receiptRequiredText, intro, thisMonthContribution] =
    await Promise.all([
      // ONLY switched-on banks reach the member. This is what makes
      // "Deactivate bank" in the Admin Panel take effect immediately.
      prisma.bank.findMany({
        where: { isActive: true },
        // The account the office marked as the default is listed first, then
        // the rest in the order the office arranged them.
        orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          accountName: true,
          accountNumber: true,
          branch: true,
          qrImageUrl: true,
          instructions: true,
          // Which service this is: BANK, ESEWA, KHALTI or OTHER.
          methodType: true,
          // The label to print above the number, e.g. "eSewa ID".
          accountLabel: true,
          isDefault: true,
        },
      }),
      // Rs. 20 by default - see Admin Panel -> Settings -> Monthly fund.
      readSettingValue('fund.monthlyAmount', '20'),
      readSettingValue('fund.receiptRequired', 'true'),
      readSettingValue(
        'fund.intro',
        'Transfer the amount to one of the accounts below, then submit the payment details.',
      ),
      prisma.monthlyContribution.findUnique({
        where: { memberId_periodMonth: { memberId: (await requireMember()).id, periodMonth: monthStart(new Date()) } },
        select: { requiredAmount: true },
      }),
    ]);

  const monthlyAmount =
    thisMonthContribution?.requiredAmount ?? (Number(monthlyAmountText) || 20);
  const receiptRequired = receiptRequiredText.toLowerCase() !== 'false';

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading eyebrow="Monthly fund" title="Pay your contribution" description={intro} />
        <Link href="/member/fund" className="btn btn-outline btn-sm">
          <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
          Back to my fund
        </Link>
      </div>

      <Alert tone="info" title="Please pay first, then submit this form">
        Transfer the money to the account shown below. After that, fill in the transaction details so
        the office can match your payment. Your balance is only updated once the office verifies it.
      </Alert>

      <div className="card p-5 sm:p-6">
        <PayFundForm
          banks={banks}
          monthlyAmount={monthlyAmount}
          receiptRequired={receiptRequired}
          defaultMonth={defaultMonth}
        />
      </div>
    </div>
  );
}
