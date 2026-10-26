// ========================================
// MEMBERSHIP REQUESTS - THE RULES, IN ONE PLACE
// ========================================
// Every read and write for the registration-request feature lives here. The
// pages and the API routes call these functions instead of talking to Prisma
// directly, so the rules cannot drift apart between the screen the applicant
// sees and the screen the administrator sees.
//
// THE THREE STEPS, AND WHAT EACH ONE IS ALLOWED TO DO
//   1. createRequest()      a visitor asks to join. Writes ONE row, PENDING.
//                           Creates NO account and grants NO access.
//   2. approve / reject     an administrator decides. Approval creates a
//                           single-use activation link - still no account.
//   3. activateMembership() the applicant opens that link and chooses a
//                           password. THIS is where the User row is created.
//
// WHY APPROVAL CANNOT CREATE TWO ACCOUNTS
//   - MembershipRequest.userId is UNIQUE, and activation fills it inside a
//     transaction that first re-reads the row and refuses if it is already
//     filled. Two people pressing the button at the same moment cannot both win.
//   - The activation link's fingerprint is cleared in the same transaction, so
//     the same link cannot be replayed afterwards.
// ========================================

import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { writeActivity } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { buildMembershipApprovedEmail, buildMembershipRejectedEmail } from '@/lib/email/templates';
import { isEmailConfigured, sendMail } from '@/lib/email/mailer';
import { ACTIVATION_MINUTES, findActivation, issueActivation } from '@/lib/membership/tokens';

export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const REQUEST_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

/**
 * The exact sentence an applicant is shown after a successful submission.
 *
 * It is defined once because it is shown by the API answer, by the form's
 * success panel, and (word for word) in PROJECT_GUIDE.md. Three copies would
 * eventually say three different things.
 */
export const MEMBERSHIP_REQUEST_SUCCESS_MESSAGE =
  'Your membership request has been submitted successfully. Please wait for the administrator to review and approve your request.';

// How many requests one page of the admin table shows.
export const REQUESTS_PAGE_SIZE = 10;

// ========================================
// 1. A VISITOR ASKS TO JOIN
// ========================================
export type CreateRequestResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fields?: Record<string, string> };

export async function createRequest(input: {
  fullName: string;
  email: string;
  mobileNumber: string;
  currentAddress: string;
  dateOfBirth?: string;
  occupation?: string;
  reasonForJoining: string;
  requestLetter: string;
  profilePhotoUrl?: string | null;
}): Promise<CreateRequestResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: 'The website database has not been connected yet.' };
  }

  const email = input.email.trim().toLowerCase();

  // ---------- Already a member? ----------
  // An approved member who applies again would end up with two accounts and a
  // confusing member list, so the request is refused with a message that tells
  // them what to do instead.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: false,
      message:
        'An account already exists with this email address. Please sign in instead. ' +
        'If you have forgotten your password, use "Forgot password" on the sign-in tab.',
      fields: { email: 'This email address already has an account.' },
    };
  }

  // ---------- A request is already waiting (or was already approved) ----------
  const existingRequest = await prisma.membershipRequest.findFirst({
    where: { email, status: { in: ['PENDING', 'APPROVED'] } },
    orderBy: { submittedAt: 'desc' },
    select: { id: true, status: true, submittedAt: true },
  });

  if (existingRequest) {
    return {
      ok: false,
      message:
        existingRequest.status === 'PENDING'
          ? 'A membership request with this email address is already waiting for review. ' +
            'The office will contact you once it has been decided.'
          : 'A membership request with this email address has already been approved. ' +
            'Please use the activation link that was sent to you, or contact the office.',
      fields: { email: 'A request with this email address already exists.' },
    };
  }

  const dateOfBirth = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00`) : null;

  const created = await prisma.membershipRequest.create({
    data: {
      fullName: input.fullName.trim(),
      email,
      mobileNumber: input.mobileNumber.trim(),
      currentAddress: input.currentAddress.trim(),
      dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
      occupation: input.occupation?.trim() || null,
      reasonForJoining: input.reasonForJoining.trim(),
      requestLetter: input.requestLetter.trim(),
      profilePhotoUrl: input.profilePhotoUrl ?? null,
      status: REQUEST_STATUS.PENDING,
    },
    select: { id: true },
  });

  await writeActivity({
    action: 'CREATE',
    entity: 'Membership request',
    entityId: created.id,
    detail: `${input.fullName.trim()} <${email}> asked to join the club.`,
  });

  return { ok: true, id: created.id };
}

// ========================================
// 2. READING THE LIST (Admin Panel)
// ========================================
export type ListInput = {
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type ListedRequest = Awaited<ReturnType<typeof listRequests>>['rows'][number];

export async function listRequests(input: ListInput = {}) {
  const pageSize = input.pageSize ?? REQUESTS_PAGE_SIZE;
  const page = Math.max(1, Number(input.page ?? 1) || 1);

  if (!isDatabaseConfigured()) {
    return { rows: [], total: 0, page: 1, pages: 1, counts: { PENDING: 0, APPROVED: 0, REJECTED: 0, ALL: 0 } };
  }

  const q = (input.q ?? '').trim();
  const status = (input.status ?? 'ALL').toUpperCase();
  const sort = (input.sort ?? 'newest').toLowerCase();

  const where = {
    ...(status !== 'ALL' ? { status } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { mobileNumber: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  // ---------- the counts shown on the filter tabs ----------
  const [pending, approved, rejected, all] = await Promise.all([
    prisma.membershipRequest.count({ where: { ...where, status: 'PENDING' } }),
    prisma.membershipRequest.count({ where: { ...where, status: 'APPROVED' } }),
    prisma.membershipRequest.count({ where: { ...where, status: 'REJECTED' } }),
    prisma.membershipRequest.count({ where }),
  ]);

  const counts = { PENDING: pending, APPROVED: approved, REJECTED: rejected, ALL: all };

  const select = {
    id: true,
    fullName: true,
    email: true,
    mobileNumber: true,
    currentAddress: true,
    dateOfBirth: true,
    occupation: true,
    reasonForJoining: true,
    requestLetter: true,
    profilePhotoUrl: true,
    status: true,
    rejectionReason: true,
    adminNote: true,
    submittedAt: true,
    reviewedAt: true,
    adminReadAt: true,
    activationExpiresAt: true,
    activationSentAt: true,
    activationEmailSent: true,
    activatedAt: true,
    userId: true,
    reviewedBy: { select: { name: true } },
  } as const;

  // ---------- "sort by status" ----------
  // Pending first, then approved, then rejected - the order an office actually
  // works in. Prisma would sort these alphabetically (approved, pending,
  // rejected), which puts the thing that needs attention last, so this one order
  // is worked out in memory. The list is a few hundred rows at most, and the ids
  // are taken first so pagination still lines up exactly.
  if (sort === 'status') {
    const rank: Record<string, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

    const ids = await prisma.membershipRequest.findMany({
      where,
      select: { id: true, status: true, submittedAt: true },
    });

    ids.sort((a, b) => {
      const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      if (byStatus !== 0) return byStatus;
      return b.submittedAt.getTime() - a.submittedAt.getTime();
    });

    const total = ids.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    const slice = ids.slice((safePage - 1) * pageSize, safePage * pageSize);

    const rows = await prisma.membershipRequest.findMany({
      where: { id: { in: slice.map((row) => row.id) } },
      select,
    });

    const byId = new Map(rows.map((row) => [row.id, row]));

    return {
      rows: slice.map((row) => byId.get(row.id)).filter(Boolean) as typeof rows,
      total,
      page: safePage,
      pages,
      counts,
    };
  }

  const total = all;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);

  const rows = await prisma.membershipRequest.findMany({
    where,
    select,
    orderBy: { submittedAt: sort === 'oldest' ? 'asc' : 'desc' },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  return { rows, total, page: safePage, pages, counts };
}

// ========================================
// 3. ONE REQUEST
// ========================================
export async function getRequest(id: string) {
  if (!isDatabaseConfigured()) return null;

  return prisma.membershipRequest.findUnique({
    where: { id },
    include: {
      reviewedBy: { select: { name: true } },
      user: { select: { id: true, name: true, email: true, isActive: true, emailVerifiedAt: true } },
    },
  });
}

/** How many requests are still waiting. This is the number on the menu. */
export async function countPendingRequests(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    return await prisma.membershipRequest.count({ where: { status: 'PENDING' } });
  } catch {
    return 0;
  }
}

/** How many of those nobody has opened yet (used for the "new" dot). */
export async function countUnreadRequests(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    return await prisma.membershipRequest.count({
      where: { status: 'PENDING', adminReadAt: null },
    });
  } catch {
    return 0;
  }
}

/**
 * Stamp a request as seen.
 *
 * Called when an administrator opens the application. It only ever fills an
 * empty column, so opening the same request twice does not change the time.
 */
export async function markRequestRead(id: string): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await prisma.membershipRequest.updateMany({
      where: { id, adminReadAt: null },
      data: { adminReadAt: new Date() },
    });
  } catch (error) {
    console.error('[membership] could not mark the request as read:', error);
  }
}

/** Mark every pending request as seen (the "mark all as read" button). */
export async function markAllRequestsRead(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  try {
    const result = await prisma.membershipRequest.updateMany({
      where: { adminReadAt: null },
      data: { adminReadAt: new Date() },
    });
    return result.count;
  } catch {
    return 0;
  }
}

// ========================================
// 4. EDIT (a correction, saved permanently)
// ========================================
export async function updateRequest(input: {
  id: string;
  adminId: string;
  adminName: string;
  data: {
    fullName?: string;
    email?: string;
    mobileNumber?: string;
    currentAddress?: string;
    dateOfBirth?: string;
    occupation?: string;
    reasonForJoining?: string;
    requestLetter?: string;
    adminNote?: string;
  };
}): Promise<{ ok: true } | { ok: false; message: string; fields?: Record<string, string> }> {
  const before = await prisma.membershipRequest.findUnique({ where: { id: input.id } });
  if (!before) return { ok: false, message: 'This request no longer exists.' };

  // ---------- a changed email must stay unique ----------
  let email = before.email;
  if (input.data.email !== undefined) {
    email = input.data.email.trim().toLowerCase();

    if (email !== before.email) {
      const takenByUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (takenByUser) {
        return {
          ok: false,
          message: 'Another account already uses this email address.',
          fields: { email: 'This email address already has an account.' },
        };
      }

      const takenByRequest = await prisma.membershipRequest.findFirst({
        where: { email, id: { not: input.id }, status: { in: ['PENDING', 'APPROVED'] } },
        select: { id: true },
      });
      if (takenByRequest) {
        return {
          ok: false,
          message: 'Another request with this email address is already waiting or approved.',
          fields: { email: 'Another request already uses this email address.' },
        };
      }
    }
  }

  const dateOfBirth =
    input.data.dateOfBirth === undefined
      ? before.dateOfBirth
      : input.data.dateOfBirth
        ? new Date(`${input.data.dateOfBirth}T00:00:00`)
        : null;

  await prisma.membershipRequest.update({
    where: { id: input.id },
    data: {
      fullName: input.data.fullName?.trim() || before.fullName,
      email,
      mobileNumber: input.data.mobileNumber?.trim() || before.mobileNumber,
      currentAddress: input.data.currentAddress?.trim() || before.currentAddress,
      dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
      occupation:
        input.data.occupation === undefined ? before.occupation : input.data.occupation.trim() || null,
      reasonForJoining: input.data.reasonForJoining?.trim() || before.reasonForJoining,
      requestLetter: input.data.requestLetter?.trim() || before.requestLetter,
      adminNote: input.data.adminNote === undefined ? before.adminNote : input.data.adminNote.trim() || null,
    },
  });

  await writeActivity({
    actorId: input.adminId,
    actorName: input.adminName,
    action: 'UPDATE',
    entity: 'Membership request',
    entityId: input.id,
    detail: `Corrected the application from ${before.fullName} <${before.email}>.`,
    oldValue: `${before.fullName} <${before.email}> / ${before.mobileNumber}`,
    newValue: `${input.data.fullName ?? before.fullName} <${email}> / ${
      input.data.mobileNumber ?? before.mobileNumber
    }`,
  });

  return { ok: true };
}

// ========================================
// 5. APPROVE
// ========================================
export type DecisionResult =
  | {
      ok: true;
      status: RequestStatus;
      /** Only for approvals: the link that must reach the applicant. */
      activation?: { link: string; emailed: boolean; emailError?: string };
    }
  | { ok: false; message: string };

export async function approveRequest(input: {
  id: string;
  adminId: string;
  adminName: string;
  /** Origin of the request, so the emailed link points at the real site. */
  baseUrl?: string;
}): Promise<DecisionResult> {
  const request = await prisma.membershipRequest.findUnique({ where: { id: input.id } });
  if (!request) return { ok: false, message: 'This request no longer exists.' };

  // ---------- Already finished? ----------
  if (request.userId || request.activatedAt) {
    return {
      ok: false,
      message:
        'This applicant has already activated their account, so there is nothing left to approve. ' +
        'Open Members to change their details.',
    };
  }

  // ---------- Has an account appeared meanwhile? ----------
  // An administrator may have created the account by hand (Admin -> Members)
  // while the request was waiting. Creating a second one would split the person's
  // fund history, so approval stops and says so plainly.
  const existingUser = await prisma.user.findUnique({
    where: { email: request.email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: false,
      message:
        'An account already exists with this email address. Either edit the request to use a ' +
        'different address, or manage the existing member in Admin -> Members.',
    };
  }

  // ---------- Record the decision ----------
  const updated = await prisma.membershipRequest.updateMany({
    where: { id: input.id, userId: null, status: { in: ['PENDING', 'REJECTED'] } },
    data: {
      status: REQUEST_STATUS.APPROVED,
      reviewedAt: new Date(),
      reviewedById: input.adminId,
      rejectionReason: null,
      adminReadAt: request.adminReadAt ?? new Date(),
    },
  });

  // Another administrator got there first. The row is already correct, so we
  // simply carry on and (re)issue a link - never a second account.
  if (updated.count === 0 && request.status !== 'APPROVED') {
    return { ok: false, message: 'This request was changed by somebody else. Please reload the page.' };
  }

  // ---------- Create the single-use activation link ----------
  const issued = await issueActivation(input.id, input.baseUrl);

  // ---------- Send it, but never pretend ----------
  let emailed = false;
  let emailError: string | undefined;

  if (isEmailConfigured()) {
    const mail = buildMembershipApprovedEmail({
      applicantName: request.fullName,
      link: issued.link,
      expiresMinutes: ACTIVATION_MINUTES,
    });

    const result = await sendMail({
      to: request.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    emailed = result.ok;
    if (!result.ok) emailError = result.error;

    await prisma.membershipRequest.update({
      where: { id: input.id },
      data: {
        activationSentAt: new Date(),
        activationEmailSent: emailed,
      },
    });
  }

  await writeActivity({
    actorId: input.adminId,
    actorName: input.adminName,
    action: 'APPROVE',
    entity: 'Membership request',
    entityId: input.id,
    detail: emailed
      ? `Approved ${request.fullName} <${request.email}> and emailed the activation link.`
      : `Approved ${request.fullName} <${request.email}>. No email was sent (the office must pass the link on).`,
    oldValue: request.status,
    newValue: REQUEST_STATUS.APPROVED,
  });

  return {
    ok: true,
    status: REQUEST_STATUS.APPROVED,
    activation: { link: issued.link, emailed, emailError },
  };
}

// ========================================
// 6. REJECT
// ========================================
export async function rejectRequest(input: {
  id: string;
  adminId: string;
  adminName: string;
  reason?: string;
}): Promise<DecisionResult> {
  const request = await prisma.membershipRequest.findUnique({ where: { id: input.id } });
  if (!request) return { ok: false, message: 'This request no longer exists.' };

  if (request.userId || request.activatedAt) {
    return {
      ok: false,
      message:
        'This applicant has already activated their account. To remove their access, deactivate ' +
        'them in Admin -> Members instead - rejecting the request no longer has any effect.',
    };
  }

  await prisma.membershipRequest.update({
    where: { id: input.id },
    data: {
      status: REQUEST_STATUS.REJECTED,
      reviewedAt: new Date(),
      reviewedById: input.adminId,
      rejectionReason: input.reason?.trim() || null,
      adminReadAt: request.adminReadAt ?? new Date(),
      // The activation fingerprint is kept, not deleted.
      //
      // The status REJECTED already makes the link unusable (findActivation
      // refuses it), and keeping the fingerprint lets the page say "this request
      // was not accepted" instead of "this link is not valid" - which would send
      // the applicant to the office to ask why their link is broken.
    },
  });

  // A courteous email, but only when a mail server exists and the address is
  // real. Nothing is claimed when it cannot be sent.
  if (isEmailConfigured()) {
    const mail = buildMembershipRejectedEmail({
      applicantName: request.fullName,
      reason: input.reason?.trim() || null,
    });

    void sendMail({
      to: request.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }).catch(() => undefined);
  }

  await writeActivity({
    actorId: input.adminId,
    actorName: input.adminName,
    action: 'REJECT',
    entity: 'Membership request',
    entityId: input.id,
    detail: `Rejected ${request.fullName} <${request.email}>.`,
    oldValue: request.status,
    newValue: REQUEST_STATUS.REJECTED,
  });

  return { ok: true, status: REQUEST_STATUS.REJECTED };
}

// ========================================
// 7. DELETE (permanent, with a confirmation on the screen)
// ========================================
export async function deleteRequest(input: {
  id: string;
  adminId: string;
  adminName: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const request = await prisma.membershipRequest.findUnique({ where: { id: input.id } });
  if (!request) return { ok: false, message: 'This request no longer exists.' };

  // An activated request is the audit trail of a real member account. Removing it
  // would lose the only record of how that member joined, so it is kept.
  if (request.userId) {
    return {
      ok: false,
      message:
        'This request produced an active member account and is kept as a record. ' +
        'To remove the person, deactivate them in Admin -> Members.',
    };
  }

  await prisma.membershipRequest.delete({ where: { id: input.id } });

  // The bell must not keep pointing at a request that no longer exists.
  await prisma.notification
    .deleteMany({ where: { link: { contains: `request=${input.id}` } } })
    .catch(() => undefined);

  await writeActivity({
    actorId: input.adminId,
    actorName: input.adminName,
    action: 'DELETE',
    entity: 'Membership request',
    entityId: input.id,
    detail: `Permanently deleted the request from ${request.fullName} <${request.email}>.`,
  });

  return { ok: true };
}

// ========================================
// 8. ACTIVATION - THE APPLICANT CREATES THE ACCOUNT
// ========================================
export type ActivateResult =
  | { ok: true; name: string; email: string }
  | { ok: false; message: string; reason?: string };

export async function activateMembership(input: {
  token: string;
  password: string;
  requestIp?: string | null;
}): Promise<ActivateResult> {
  const lookup = await findActivation(input.token);

  if (!lookup.ok) {
    const message =
      lookup.reason === 'expired'
        ? 'This activation link has expired. Please ask the office to send you a new one.'
        : lookup.reason === 'already-activated'
          ? 'This link has already been used. Please sign in with the password you chose.'
          : lookup.reason === 'not-approved'
            ? 'This request has not been approved yet. Please wait for the office to review it.'
            : 'This activation link is not valid. Please check that you copied the whole link.';

    return { ok: false, message, reason: lookup.reason };
  }

  // ---------- The address may have been taken since approval ----------
  const existingUser = await prisma.user.findUnique({
    where: { email: lookup.email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: false,
      message:
        'An account already exists with this email address. Please sign in instead, ' +
        'or use "Forgot password" if you do not remember the password.',
    };
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: two browsers opening the same link at the
      // same moment must not both create an account.
      const fresh = await tx.membershipRequest.findUnique({
        where: { id: lookup.requestId },
        select: {
          id: true,
          userId: true,
          activatedAt: true,
          status: true,
          fullName: true,
          email: true,
          mobileNumber: true,
          currentAddress: true,
          occupation: true,
          profilePhotoUrl: true,
        },
      });

      if (!fresh || fresh.userId || fresh.activatedAt || fresh.status !== 'APPROVED') {
        throw new Error('ALREADY_ACTIVATED');
      }

      const user = await tx.user.create({
        data: {
          email: fresh.email,
          name: fresh.fullName,
          phone: fresh.mobileNumber,
          role: 'MEMBER',
          isActive: true,
          passwordHash,
          // The applicant just proved the address by opening the link we only
          // ever sent there.
          emailVerifiedAt: now,
        },
        select: { id: true, name: true, email: true },
      });

      await tx.memberProfile.create({
        data: {
          userId: user.id,
          address: fresh.currentAddress,
          designation: fresh.occupation,
          photoUrl: fresh.profilePhotoUrl,
          status: 'ACTIVE',
          joinedAt: now,
          isPublic: false,
        },
      });

      await tx.membershipRequest.update({
        where: { id: fresh.id },
        data: {
          userId: user.id,
          activatedAt: now,
          // The fingerprint is deliberately KEPT.
          //
          // The link is already dead: findActivation() refuses as soon as userId
          // or activatedAt is set (see lib/membership/tokens.ts). Keeping the
          // fingerprint is what lets the page tell a person who clicks their old
          // link "this has already been used - please sign in" instead of the
          // unhelpful "this link is not valid". A fingerprint is not a usable
          // secret, so there is nothing to leak.
          adminReadAt: now,
        },
      });

      return user;
    });

    await writeActivity({
      actorId: created.id,
      actorName: created.name,
      action: 'CREATE',
      entity: 'Member account',
      entityId: created.id,
      detail: `Account activated from membership request ${lookup.requestId}.`,
      ipAddress: input.requestIp ?? null,
    });

    // NO "welcome" notification here on purpose.
    //
    // The member's bell only changes when an ADMINISTRATOR acts: assigns a duty,
    // sets a monthly task, publishes a score, sends a message. A member activating
    // their own account is their own action.

    return { ok: true, name: created.name, email: created.email };
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_ACTIVATED') {
      return {
        ok: false,
        message: 'This link has already been used. Please sign in with the password you chose.',
        reason: 'already-activated',
      };
    }

    console.error('[membership] activation failed:', error);
    return {
      ok: false,
      message: 'The account could not be created just now. Please try again in a moment.',
    };
  }
}
