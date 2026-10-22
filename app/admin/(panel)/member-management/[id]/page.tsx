// ========================================
// ADMIN PANEL - ONE MEMBER'S FILE
// ========================================
// Address: /admin/member-management/<memberProfileId>?tab=duties|tasks|performance|history
//
// WHAT IS IN THE FILE
//   1. Responsibilities  permanent duties - no deadline, no expiry, never deleted
//                        automatically, only removed by an administrator (and the
//                        removal is kept in the history).
//   2. Monthly tasks     work for ONE month, with status and admin remarks.
//   3. Performance       the five scores, the overall, the rank, publish.
//   4. History           who changed which duty, before and after.
//
// SECURITY
//   requireAdmin() below is the real lock. A member who guesses a member id gets
//   sent to /unauthorized; the API routes behind every button check the role
//   again on the server (lib/api/guard.ts).
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { getMemberFile } from '@/lib/members/service';
import { MemberFile } from '@/components/admin/MemberFile';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member file',
  robots: { index: false, follow: false },
};

export default async function MemberFilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();

  if (!isDatabaseConfigured()) notFound();

  const { id } = await params;
  const { tab } = await searchParams;

  const file = await getMemberFile(id);
  if (!file) notFound();

  const audit = await prisma.memberResponsibilityAudit.findMany({
    where: { memberProfileId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // ---------- task history ----------
  // One line per task: its most recent move, and who made it. The full history is
  // in task_updates; the file only needs the last entry to stay readable.
  const taskUpdates = await prisma.taskUpdate.findMany({
    where: { task: { assignedToId: file.profile.userId } },
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      taskId: true,
      status: true,
      createdAt: true,
      by: { select: { name: true } },
    },
  });

  const lastUpdateByTask = new Map<string, string>();
  for (const row of taskUpdates) {
    if (lastUpdateByTask.has(row.taskId)) continue;
    lastUpdateByTask.set(
      row.taskId,
      `${row.status} - ${row.createdAt.toLocaleDateString('en-GB')} by ${row.by?.name ?? 'the office'}`,
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/member-management"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-brand-700"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          All members
        </Link>
        <p className="text-xs text-ink-500">
          Permanent duties have no deadline. Monthly tasks are separate and belong to one month.
        </p>
      </div>

      <MemberFile
        initialTab={tab}
        member={{
          id: file.profile.id,
          name: file.profile.user.name,
          email: file.profile.user.email,
          phone: file.profile.user.phone,
          membershipNo: file.profile.membershipNo,
          designation: file.profile.designation,
          workingArea: file.profile.workingArea,
          status: file.profile.status,
          photoUrl: file.profile.photoUrl,
          joinedAt: (file.profile.joinedAt ?? file.profile.createdAt).toISOString(),
        }}
        responsibilities={file.profile.responsibilities.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          isActive: row.isActive,
          updatedAt: row.updatedAt.toISOString(),
        }))}
        tasks={file.tasks.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          periodMonth: row.periodMonth,
          remarks: row.remarks,
          completedAt: row.completedAt ? row.completedAt.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
          lastUpdate: lastUpdateByTask.get(row.id) ?? null,
        }))}
        evaluations={file.profile.evaluations.map((row) => ({
          id: row.id,
          periodMonth: row.periodMonth,
          workQuality: row.workQuality,
          taskCompletion: row.taskCompletion,
          participation: row.participation,
          responsibility: row.responsibility,
          teamwork: row.teamwork,
          overall: row.overall,
          rank: row.rank,
          remarks: row.remarks,
          status: row.status,
        }))}
        audit={audit.map((row) => ({
          id: row.id,
          action: row.action,
          beforeText: row.beforeText,
          afterText: row.afterText,
          createdAt: row.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
