// ========================================
// ADMIN PANEL - MEMBER REGISTRATION REQUESTS
// ========================================
// Address: /admin/member-requests
//
// WHERE THIS SITS
//   Inside the EXISTING admin panel, in the "People" group, right under Members.
//   It is not a second admin area: it uses the same session, the same guards, the
//   same navigation and the same look.
//
// WHO MAY OPEN IT
//   Any signed-in administrator. requireAdmin() below re-checks the role on the
//   server for every request - hiding the menu link is not what protects it.
//
// WHAT IT SHOWS
//   Every membership request, newest first by default, with the pending ones
//   counted on the filter tabs and on the menu badge. The actual approve / reject
//   / edit / delete actions are API calls made from
//   components/admin/MembershipRequestsManager.tsx, each guarded again on the
//   server by requireAdminApi().
//
// WHY THE LIST IS READ ON THE SERVER
//   So the table is already correct in the first paint (no spinner, no empty
//   flash), and so the search box works even when a filter produces nothing -
//   the counts on the tabs come from the same query as the rows.
// ========================================

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { isEmailConfigured } from '@/lib/email/mailer';
import { listRequests, REQUESTS_PAGE_SIZE } from '@/lib/membership/service';
import { MembershipRequestsManager } from '@/components/admin/MembershipRequestsManager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member registration requests',
  robots: { index: false, follow: false },
};

export default async function AdminMemberRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string; request?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;

  const q = (params.q ?? '').trim();
  const status = (params.status ?? 'ALL').toUpperCase();
  const sort = (params.sort ?? 'newest').toLowerCase();
  const page = Math.max(1, Number(params.page ?? '1') || 1);

  const data = await listRequests({ q, status, sort, page, pageSize: REQUESTS_PAGE_SIZE });

  // The dates are converted to plain strings here, because a Date object cannot
  // be handed from a server component to a client component.
  const rows = data.rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    mobileNumber: row.mobileNumber,
    currentAddress: row.currentAddress,
    dateOfBirth: row.dateOfBirth ? row.dateOfBirth.toISOString() : null,
    occupation: row.occupation,
    reasonForJoining: row.reasonForJoining,
    requestLetter: row.requestLetter,
    profilePhotoUrl: row.profilePhotoUrl,
    status: row.status,
    rejectionReason: row.rejectionReason,
    adminNote: row.adminNote,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    adminReadAt: row.adminReadAt ? row.adminReadAt.toISOString() : null,
    activationExpiresAt: row.activationExpiresAt ? row.activationExpiresAt.toISOString() : null,
    activationEmailSent: row.activationEmailSent,
    activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
    userId: row.userId,
    reviewedByName: row.reviewedBy?.name ?? null,
  }));

  return (
    <MembershipRequestsManager
      rows={rows}
      counts={data.counts}
      total={data.total}
      page={data.page}
      pages={data.pages}
      pageSize={REQUESTS_PAGE_SIZE}
      query={q}
      status={status}
      sort={sort}
      emailConfigured={isEmailConfigured()}
      openId={params.request ?? null}
    />
  );
}
