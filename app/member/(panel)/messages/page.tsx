import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// MEMBER PANEL - MESSAGES
// ========================================
// Address: /member/messages
//
// The member's side of the conversation with the office. The office answers
// from  Admin Panel -> Contact messages  (or from the Admin Panel message list),
// so the whole exchange stays in one thread per member.
//
// The talking part is components/member/MessageThread.tsx; this page only
// checks who is asking and draws the heading.
// ========================================

import type { Metadata } from 'next';
import { requireMember } from '@/lib/auth/guards';
import { SectionHeading } from '@/components/ui/Section';
import { MessageThread } from '@/components/member/MessageThread';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'member.messages'), robots: { index: false, follow: false } };
}

export default async function MemberMessagesPage() {
  await requireMember();

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Member panel"
        icon="mail"
        title="Messages with the office"
        description="Ask about your membership, your monthly contribution, a loan or anything else. Only you and the office can read this."
      />

      <MessageThread />
    </div>
  );
}
