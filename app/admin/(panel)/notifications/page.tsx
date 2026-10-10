// ========================================
// ADMIN PANEL - NOTIFICATIONS
// ========================================
// Address: /admin/notifications
//
// WHAT AN ADMINISTRATOR SEES HERE
//   The same list a member sees, but for their own account:
//     - a new member was created / verified their email
//     - a payment was submitted and is waiting to be verified
//     - payments that were approved or refused
//     - loan activity (a loan was recorded, repaid, or has gone overdue)
//     - other important system events
//
//   The list is drawn by components/shared/NotificationCentre.tsx, so the
//   Admin Panel and the member panel behave identically.
// ========================================

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { SectionHeading } from '@/components/ui/Section';
import { NotificationCentre } from '@/components/shared/NotificationCentre';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

export default async function AdminNotificationsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Admin panel"
        icon="bell"
        title="Notifications"
        description="New members, payments waiting to be verified, loan activity and other events that need somebody's attention."
      />

      <NotificationCentre />
    </div>
  );
}
