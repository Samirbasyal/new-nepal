import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - MESSAGES FROM MEMBERS
// ========================================
// Address: /admin/member-messages?memberId=...
//
// WHAT THIS IS
//   The office's side of the private conversation with a member. It is NOT the
//   public contact form - that one is  Inbox -> Contact messages  and comes from
//   people who filled in the form on the website.
//
// HOW IT WORKS
//   Left: every member who has written in, newest first, with a count of the
//   messages still waiting for an answer.
//   Right: the whole conversation with the member you pick, and a box to reply.
//
// WHO MAY OPEN IT
//   Any administrator (requireAdmin) - the office has to be able to answer.
//   The API checks the role again on the server.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/Section';
import { MemberConversation } from '@/components/admin/MemberConversation';
import { requireAdmin } from '@/lib/auth/guards';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { withNepaliDate } from '@/lib/nepali-date';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.memberMessages'), robots: { index: false, follow: false } };
}

export default async function AdminMemberMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const selectedId = params.memberId ?? null;

  // ========================================
  // EVERY MEMBER WHO HAS WRITTEN IN
  // ========================================
  let threads: {
    memberId: string;
    memberName: string;
    memberEmail: string;
    lastMessage: string;
    lastAt: Date;
    fromMember: boolean;
    waiting: number;
  }[] = [];

  if (isDatabaseConfigured()) {
    try {
      const recent = await prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: { threadMemberId: true, senderId: true, subject: true, body: true, readAt: true, createdAt: true },
      });

      const grouped = new Map<string, (typeof threads)[number]>();

      for (const row of recent) {
        const existing = grouped.get(row.threadMemberId);
        const fromMember = row.senderId === row.threadMemberId;

        if (!existing) {
          grouped.set(row.threadMemberId, {
            memberId: row.threadMemberId,
            memberName: '(loading)',
            memberEmail: '',
            lastMessage: row.subject ?? row.body.slice(0, 70),
            lastAt: row.createdAt,
            fromMember,
            waiting: fromMember && !row.readAt ? 1 : 0,
          });
        } else if (fromMember && !row.readAt) {
          existing.waiting += 1;
        }
      }

      const ids = [...grouped.keys()];
      const members = ids.length
        ? await prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, email: true },
          })
        : [];

      const byId = new Map(members.map((member) => [member.id, member]));

      threads = [...grouped.values()].map((thread) => ({
        ...thread,
        memberName: byId.get(thread.memberId)?.name ?? '(account deleted)',
        memberEmail: byId.get(thread.memberId)?.email ?? '',
      }));
    } catch (error) {
      console.error('[member-messages] could not build the thread list:', error);
    }
  }

  const selected = selectedId ? threads.find((thread) => thread.memberId === selectedId) : null;

  // A member can be opened even before they have written (so the office can
  // start the conversation), so we look the name up when it is not in the list.
  const selectedName =
    selected?.memberName ??
    (selectedId && isDatabaseConfigured()
      ? ((
          await prisma.user.findUnique({
            where: { id: selectedId },
            select: { name: true },
          })
        )?.name ?? 'this member')
      : 'this member');

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Admin panel"
        icon="mail"
        title="Messages from members"
        description="The private conversation between a member and the office. Answering here notifies the member and appears in their member panel."
      />

      {threads.length === 0 ? (
        <EmptyState
          icon="mail"
          title="No member has written yet"
          description="When a member writes from their own panel (Member panel → Messages), their name appears here and you can answer them."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          {/* ========================================
              THE LIST OF CONVERSATIONS
              ======================================== */}
          <aside className="card p-4">
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Conversations ({threads.length})
            </h2>

            <ul className="mt-3 space-y-2">
              {threads.map((thread) => {
                const active = thread.memberId === selectedId;

                return (
                  <li key={thread.memberId}>
                    <Link
                      href={`/admin/member-messages?memberId=${thread.memberId}`}
                      className={`block rounded-card p-3 transition ${
                        active ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-ink-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink-900">{thread.memberName}</span>
                        {thread.waiting > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                            {thread.waiting}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 truncate text-xs text-ink-500">{thread.lastMessage}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        {thread.fromMember ? 'From the member' : 'From the office'} ·{' '}
                        {withNepaliDate(thread.lastAt)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* ========================================
              THE CONVERSATION
              ======================================== */}
          <div>
            {selectedId ? (
              <MemberConversation memberId={selectedId} memberName={selectedName} />
            ) : (
              <div className="card p-6 text-center">
                <Icon name="mail" className="mx-auto h-8 w-8 text-ink-300" />
                <h3 className="mt-3 font-display text-base font-bold text-ink-900">
                  Choose a member on the left
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
                  You will see the whole conversation and a box to write your reply. The member is
                  notified as soon as you send it.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
