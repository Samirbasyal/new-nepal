// ========================================
// ADMIN PANEL - SUPPORTERS AND THEIR DONATIONS
// ========================================
// Address: /admin/donors/amounts
//
// One row per Donors & Supporters profile, with the money worked out from the
// donation TRANSACTIONS:
//
//   Confirmed = sum of VERIFIED donations
//   Waiting   = sum of PENDING donations (never counted as received)
//   Gifts     = how many separate donations there are
//
// A donor profile never stores an amount of its own, so a supporter cannot be
// counted twice. Recording a new gift adds a transaction and nothing else.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { SectionHeading } from '@/components/ui/Section';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { DonorTotals, type DonorTotalRow } from '@/components/admin/DonorTotals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Supporter donations',
  robots: { index: false, follow: false },
};

export default async function AdminDonorAmountsPage() {
  await requireAdmin();

  if (!isDatabaseConfigured()) {
    return <Alert tone="warning" title="The database is not set up yet" />;
  }

  const donors = await prisma.donor.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      organization: true,
      donations: {
        where: { isDeleted: false },
        select: { amount: true, status: true },
      },
    },
  });

  const rows: DonorTotalRow[] = donors.map((donor) => {
    let confirmed = 0;
    let pending = 0;

    for (const donation of donor.donations) {
      if (donation.status === 'VERIFIED') confirmed += donation.amount;
      else if (donation.status === 'PENDING' || donation.status === 'INITIATED') {
        pending += donation.amount;
      }
      // REJECTED and INFO_REQUIRED are deliberately counted as neither.
    }

    return {
      id: donor.id,
      name: donor.name,
      organization: donor.organization,
      confirmed,
      pending,
      count: donor.donations.length,
    };
  });

  return (
    <div>
      <SectionHeading
        eyebrow="Donors & supporters"
        icon="heart"
        title="What each supporter has given"
        description="Totals are added up from the donation records themselves. Pending gifts are shown separately and are not counted as money received."
      />

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/admin/donors"
          className="inline-flex items-center gap-1.5 rounded-btn border border-ink-300 px-3 py-2 font-medium text-ink-700 hover:bg-ink-100"
        >
          <Icon name="users" className="h-4 w-4" />
          Supporter profiles
        </Link>
        <Link
          href="/admin/donations"
          className="inline-flex items-center gap-1.5 rounded-btn border border-ink-300 px-3 py-2 font-medium text-ink-700 hover:bg-ink-100"
        >
          <Icon name="heart" className="h-4 w-4" />
          Donation records
        </Link>
      </div>

      <DonorTotals rows={rows} />
    </div>
  );
}
