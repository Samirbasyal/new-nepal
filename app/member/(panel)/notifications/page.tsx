// ========================================
// MEMBER PANEL - NOTIFICATIONS
// ========================================
// Address: /member/notifications
//
// WHAT A MEMBER SEES HERE
//   Everything the website has told them, newest first:
//     - the monthly Rs. 20 contribution and its due date
//     - payment submitted, approved or refused (with the reason)
//     - loan news: approved, paid out, repayment recorded, overdue, completed
//     - notices from the office
//     - account news: created, verified, switched off
//
//   The list itself is drawn by components/shared/NotificationCentre.tsx, which
//   the Admin Panel uses too, so both look and behave the same way.
//
// SAFETY
//   The notifications come from the API with the person's own session, so a
//   member can never see somebody else's.
// ========================================

import type { Metadata } from 'next';
import { requireMember } from '@/lib/auth/guards';
import { SectionHeading } from '@/components/ui/Section';
import { NotificationCentre } from '@/components/shared/NotificationCentre';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

export default async function MemberNotificationsPage() {
  await requireMember();

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Member panel"
        icon="bell"
        title="Notifications"
        description="Monthly fund reminders, payment decisions, loan news and notices from the office - all in one place."
      />

      <NotificationCentre />
    </div>
  );
}
