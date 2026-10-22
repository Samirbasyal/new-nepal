// ========================================
// MEMBER MANAGEMENT - SERVER HELPERS
// ========================================
// Every database read and write for the member file lives here, so the pages and
// the API routes never talk to Prisma directly and cannot drift apart.
//
// THE THREE PARTS OF A MEMBER FILE
//   1. Profile      - name, phone, email, post, working area, status
//   2. Duties       - permanent responsibilities (no deadline, no expiry)
//   3. Monthly work - tasks + one performance evaluation per month
//
// PERMISSIONS
//   Everything here is called only after requireAdminApi()/requireAdmin() has
//   passed, except the two member-facing helpers at the bottom, which are called
//   with the signed-in member's own user id and cannot read anyone else's rows.
// ========================================

import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';

export type ScoreKey =
  | 'workQuality'
  | 'taskCompletion'
  | 'participation'
  | 'responsibility'
  | 'teamwork';

export const SCORE_KEYS: ScoreKey[] = [
  'workQuality',
  'taskCompletion',
  'participation',
  'responsibility',
  'teamwork',
];

// The five parts are weighted equally until an administrator changes the
// weights in Settings. Equal weights mean the overall score is simply the
// average - which is easy to explain to a member who asks "why 7.4?".
export const DEFAULT_WEIGHTS: Record<ScoreKey, number> = {
  workQuality: 20,
  taskCompletion: 20,
  participation: 20,
  responsibility: 20,
  teamwork: 20,
};

export function currentMonth(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Tell a member that their permanent duties changed.
 *
 * A failure here must NEVER undo the save: the administrator's edit is the
 * important thing, and a notification is only a courtesy. So every call is
 * wrapped and the error is swallowed on purpose.
 */
async function notifyMemberOfDuties(
  memberProfileId: string,
  title: string,
  message: string,
): Promise<void> {
  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      select: { userId: true },
    });
    if (!profile) return;
    await notifyUser({ userId: profile.userId, title, message, type: 'INFO', link: '/member/duties' });
  } catch {
    // ignored on purpose - see the note above
  }
}

export function isValidMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

// ========================================
// OVERALL SCORE
// ========================================
// Weighted average of the parts that were actually filled in. If the
// administrator left a part empty, its weight is not counted - we never treat a
// blank box as a zero, because that would quietly punish the member.
export function calculateOverall(
  scores: Partial<Record<ScoreKey, number | null>>,
  weights: Record<ScoreKey, number> = DEFAULT_WEIGHTS
): number | null {
  let total = 0;
  let usedWeight = 0;

  for (const key of SCORE_KEYS) {
    const value = scores[key];
    const weight = weights[key] ?? 0;
    if (typeof value !== 'number' || Number.isNaN(value) || weight <= 0) continue;
    total += value * weight;
    usedWeight += weight;
  }

  if (usedWeight === 0) return null;
  return Math.round((total / usedWeight) * 100) / 100;
}

// ========================================
// MONTHLY RANKING
// ========================================
// Highest score first. Members with the same score share the same rank, and the
// next member skips accordingly (1, 1, 3 - not 1, 2, 3), which is what a
// printed result sheet normally does.
export function rankScores(
  rows: { id: string; overall: number | null }[]
): Map<string, number> {
  const ranked = rows
    .filter((row) => typeof row.overall === 'number')
    .sort((a, b) => (b.overall as number) - (a.overall as number));

  const result = new Map<string, number>();
  let lastScore: number | null = null;
  let lastRank = 0;

  ranked.forEach((row, index) => {
    const score = row.overall as number;
    if (lastScore !== null && score === lastScore) {
      result.set(row.id, lastRank);
      return;
    }
    lastRank = index + 1;
    lastScore = score;
    result.set(row.id, lastRank);
  });

  return result;
}

// ========================================
// READING A MEMBER FILE
// ========================================
export async function getMemberFile(memberId: string) {
  const profile = await prisma.memberProfile.findUnique({
    where: { id: memberId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      },
      responsibilities: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      evaluations: { orderBy: { periodMonth: 'desc' } },
    },
  });

  if (!profile) return null;

  const tasks = await prisma.task.findMany({
    where: { assignedToId: profile.userId },
    orderBy: [{ createdAt: 'desc' }],
  });

  return { profile, tasks };
}

// ========================================
// PERMANENT RESPONSIBILITIES
// ========================================
// Each write also records what changed and who changed it, so the office can
// answer "who removed that duty?" months later.
export async function addResponsibility(input: {
  memberProfileId: string;
  title?: string | null;
  description: string;
  adminId: string;
}) {
  const count = await prisma.memberResponsibility.count({
    where: { memberProfileId: input.memberProfileId },
  });

  const created = await prisma.memberResponsibility.create({
    data: {
      memberProfileId: input.memberProfileId,
      title: input.title?.trim() || null,
      description: input.description.trim(),
      sortOrder: count,
      createdById: input.adminId,
      updatedById: input.adminId,
    },
  });

  await prisma.memberResponsibilityAudit.create({
    data: {
      memberProfileId: input.memberProfileId,
      responsibilityId: created.id,
      action: 'CREATED',
      afterText: created.description,
      changedById: input.adminId,
    },
  });

  await notifyMemberOfDuties(
    input.memberProfileId,
    'New responsibility added',
    `The office added a permanent responsibility to your profile: ${created.description}`,
  );

  return created;
}

export async function updateResponsibility(input: {
  id: string;
  memberProfileId: string;
  title?: string | null;
  description?: string;
  isActive?: boolean;
  adminId: string;
}) {
  const before = await prisma.memberResponsibility.findFirst({
    where: { id: input.id, memberProfileId: input.memberProfileId },
  });
  if (!before) return null;

  const updated = await prisma.memberResponsibility.update({
    where: { id: before.id },
    data: {
      title: input.title === undefined ? before.title : input.title?.trim() || null,
      description:
        input.description === undefined ? before.description : input.description.trim(),
      isActive: input.isActive === undefined ? before.isActive : input.isActive,
      updatedById: input.adminId,
    },
  });

  const changed =
    before.description !== updated.description ||
    before.title !== updated.title ||
    before.isActive !== updated.isActive;

  if (changed) {
    await prisma.memberResponsibilityAudit.create({
      data: {
        memberProfileId: input.memberProfileId,
        responsibilityId: updated.id,
        action: 'UPDATED',
        beforeText: before.description,
        afterText: updated.description,
        changedById: input.adminId,
      },
    });

    await notifyMemberOfDuties(
      input.memberProfileId,
      'Your responsibilities were updated',
      `The office changed a permanent responsibility on your profile: ${updated.description}`,
    );
  }

  return updated;
}

export async function deleteResponsibility(input: {
  id: string;
  memberProfileId: string;
  adminId: string;
}) {
  const before = await prisma.memberResponsibility.findFirst({
    where: { id: input.id, memberProfileId: input.memberProfileId },
  });
  if (!before) return null;

  await prisma.memberResponsibility.delete({ where: { id: before.id } });

  await prisma.memberResponsibilityAudit.create({
    data: {
      memberProfileId: input.memberProfileId,
      responsibilityId: before.id,
      action: 'DELETED',
      beforeText: before.description,
      changedById: input.adminId,
    },
  });

  await notifyMemberOfDuties(
    input.memberProfileId,
    'A responsibility was removed',
    `The office removed this permanent responsibility from your profile: ${before.description}`,
  );

  return before;
}

// ========================================
// PERFORMANCE - SAVE ONE MONTH
// ========================================
// Saving twice for the same member and month UPDATES the same row (the unique
// pair in the database guarantees there can never be two).
export async function saveEvaluation(input: {
  memberProfileId: string;
  periodMonth: string;
  scores: Partial<Record<ScoreKey, number | null>>;
  remarks?: string | null;
  adminId: string;
}) {
  const overall = calculateOverall(input.scores);

  return prisma.performanceEvaluation.upsert({
    where: {
      memberProfileId_periodMonth: {
        memberProfileId: input.memberProfileId,
        periodMonth: input.periodMonth,
      },
    },
    create: {
      memberProfileId: input.memberProfileId,
      periodMonth: input.periodMonth,
      workQuality: input.scores.workQuality ?? null,
      taskCompletion: input.scores.taskCompletion ?? null,
      participation: input.scores.participation ?? null,
      responsibility: input.scores.responsibility ?? null,
      teamwork: input.scores.teamwork ?? null,
      overall,
      remarks: input.remarks?.trim() || null,
      evaluatedById: input.adminId,
      status: 'DRAFT',
    },
    update: {
      workQuality: input.scores.workQuality ?? null,
      taskCompletion: input.scores.taskCompletion ?? null,
      participation: input.scores.participation ?? null,
      responsibility: input.scores.responsibility ?? null,
      teamwork: input.scores.teamwork ?? null,
      overall,
      remarks: input.remarks?.trim() || null,
      evaluatedById: input.adminId,
    },
  });
}

// Publishing a month recalculates everybody's rank for that month, so a member
// always sees a rank that matches the scores their colleagues can see.
export async function publishMonth(periodMonth: string) {
  const rows = await prisma.performanceEvaluation.findMany({
    where: { periodMonth },
    select: {
      id: true,
      overall: true,
      memberProfileId: true,
      memberProfile: { select: { userId: true } },
    },
  });

  const ranks = rankScores(rows);

  await prisma.$transaction(
    rows.map((row) =>
      prisma.performanceEvaluation.update({
        where: { id: row.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          rank: ranks.get(row.id) ?? null,
        },
      })
    )
  );

  // ========================================
  // TELL EVERY MEMBER THEIR RESULT
  // ========================================
  // Only now, after the results are published, can a member see them - so this is
  // the one moment a notification makes sense. A failure here cannot undo the
  // publication (which is already saved), and is swallowed on purpose.
  for (const row of rows) {
    const rank = ranks.get(row.id);
    if (!rank) continue;
    try {
      await notifyUser({
        userId: row.memberProfile.userId,
        title: `Your ${periodMonth} performance result`,
        message: row.overall === null
          ? `Your result for ${periodMonth} has been published. Your rank: ${rank}.`
          : `Your result for ${periodMonth} has been published. Score: ${row.overall.toFixed(1)} - rank ${rank}.`,
        type: 'SUCCESS',
        link: '/member/performance',
      });
    } catch {
      // ignored on purpose
    }
  }

  return ranks;
}

// ========================================
// MEMBER-FACING HELPERS
// ========================================
// Called with the signed-in member's own user id. They can only ever return that
// member's rows, so another member's duties cannot be read even by guessing ids.
export async function getMyResponsibilities(userId: string) {
  return prisma.memberResponsibility.findMany({
    where: { isActive: true, memberProfile: { userId } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, title: true, description: true, updatedAt: true },
  });
}

export async function getMyEvaluations(userId: string) {
  return prisma.performanceEvaluation.findMany({
    where: { status: 'PUBLISHED', memberProfile: { userId } },
    orderBy: { periodMonth: 'desc' },
    take: 12,
  });
}

// ========================================
// MEMBER MANAGEMENT - THE LIST BEHIND THE ADMIN TABLE
// ========================================
// One query for the whole screen: every member, their post, their working area,
// how many permanent duties they carry, what happened to this month's tasks, and
// the score and rank they were given for the current month.
//
// WHY THE SORTING HAPPENS IN JAVASCRIPT
//   Two of the sort orders (score, rank) live on a DIFFERENT table, and some
//   members have no evaluation at all. Sorting here keeps members without a score
//   at the bottom instead of letting the database decide where a NULL belongs,
//   and the club's member list is small enough for this to be instant.
export type MemberManagementFilters = {
  q?: string;
  position?: string;
  area?: string;
  status?: string;
  /** name | newest | oldest | score | rank */
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type MemberManagementRow = {
  /** MemberProfile id - the member file this row opens. */
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  membershipNo: string | null;
  designation: string | null;
  workingArea: string | null;
  photoUrl: string | null;
  status: string;
  isActive: boolean;
  joinedAt: string | null;
  responsibilityCount: number;
  tasksTodo: number;
  tasksInProgress: number;
  tasksDone: number;
  score: number | null;
  rank: number | null;
  evaluationPublished: boolean;
};

export async function listMemberManagement(filters: MemberManagementFilters) {
  const month = currentMonth();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));

  const where: Record<string, unknown> = {};

  const term = (filters.q ?? '').trim();
  if (term) {
    where.OR = [
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { user: { phone: { contains: term, mode: 'insensitive' } } },
      { membershipNo: { contains: term, mode: 'insensitive' } },
    ];
  }
  if (filters.position) where.designation = filters.position;
  if (filters.area) where.workingArea = { contains: filters.area, mode: 'insensitive' };
  if (filters.status) where.status = filters.status;

  const profiles = await prisma.memberProfile.findMany({
    where,
    take: 1000,
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, isActive: true },
      },
      responsibilities: { where: { isActive: true }, select: { id: true } },
      evaluations: {
        where: { periodMonth: month },
        select: { overall: true, rank: true, status: true },
      },
    },
  });

  // ---------- this month's tasks, counted per member ----------
  const userIds = profiles.map((profile) => profile.userId);
  const groups = userIds.length
    ? await prisma.task.groupBy({
        by: ['assignedToId', 'status'],
        where: { periodMonth: month, assignedToId: { in: userIds } },
        _count: { _all: true },
      })
    : [];

  const taskCounts = new Map<string, { todo: number; inProgress: number; done: number }>();
  for (const group of groups) {
    const entry = taskCounts.get(group.assignedToId) ?? { todo: 0, inProgress: 0, done: 0 };
    if (group.status === 'DONE') entry.done += group._count._all;
    else if (group.status === 'IN_PROGRESS') entry.inProgress += group._count._all;
    else entry.todo += group._count._all;
    taskCounts.set(group.assignedToId, entry);
  }

  const rows: MemberManagementRow[] = profiles.map((profile) => {
    const evaluation = profile.evaluations[0] ?? null;
    const counts = taskCounts.get(profile.userId) ?? { todo: 0, inProgress: 0, done: 0 };

    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.user.name,
      email: profile.user.email,
      phone: profile.user.phone,
      membershipNo: profile.membershipNo,
      designation: profile.designation,
      workingArea: profile.workingArea,
      photoUrl: profile.photoUrl,
      status: profile.status,
      isActive: profile.user.isActive,
      joinedAt: (profile.joinedAt ?? profile.createdAt).toISOString(),
      responsibilityCount: profile.responsibilities.length,
      tasksTodo: counts.todo,
      tasksInProgress: counts.inProgress,
      tasksDone: counts.done,
      score: evaluation?.overall ?? null,
      rank: evaluation?.rank ?? null,
      evaluationPublished: evaluation?.status === 'PUBLISHED',
    };
  });

  // ---------- sorting ----------
  const byNumber = (a: number | null, b: number | null) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  };
  const byDate = (a: string | null, b: string | null) => (a ?? '').localeCompare(b ?? '');

  switch (filters.sort) {
    case 'newest':
      rows.sort((a, b) => byDate(b.joinedAt, a.joinedAt));
      break;
    case 'oldest':
      rows.sort((a, b) => byDate(a.joinedAt, b.joinedAt));
      break;
    case 'score':
      rows.sort((a, b) => byNumber(b.score, a.score) || a.name.localeCompare(b.name));
      break;
    case 'rank':
      rows.sort((a, b) => byNumber(a.rank, b.rank) || a.name.localeCompare(b.name));
      break;
    case 'name':
    default:
      rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const slice = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ---------- the numbers above the table ----------
  const [active, inactive, responsibilityTotal, monthTaskGroups] = await Promise.all([
    prisma.memberProfile.count({ where: { status: 'ACTIVE' } }),
    prisma.memberProfile.count({ where: { status: { in: ['INACTIVE', 'SUSPENDED'] } } }),
    prisma.memberResponsibility.count({ where: { isActive: true } }),
    prisma.task.groupBy({
      by: ['status'],
      where: { periodMonth: month },
      _count: { _all: true },
    }),
  ]);

  const taskTotal = monthTaskGroups.reduce((sum, group) => sum + group._count._all, 0);
  const pendingTasks = monthTaskGroups
    .filter((group) => group.status !== 'DONE')
    .reduce((sum, group) => sum + group._count._all, 0);
  const completedTasks = monthTaskGroups
    .filter((group) => group.status === 'DONE')
    .reduce((sum, group) => sum + group._count._all, 0);

  const topPerformers = await prisma.performanceEvaluation.findMany({
    where: { periodMonth: month, status: 'PUBLISHED', rank: { not: null } },
    orderBy: { rank: 'asc' },
    take: 3,
    select: {
      rank: true,
      overall: true,
      memberProfile: { select: { user: { select: { name: true } } } },
    },
  });

  const positions = await prisma.memberProfile.findMany({
    where: { designation: { not: null } },
    distinct: ['designation'],
    select: { designation: true },
    orderBy: { designation: 'asc' },
  });

  return {
    rows: slice,
    total,
    page: safePage,
    pages,
    pageSize,
    month,
    stats: {
      totalMembers: profiles.length,
      activeMembers: active,
      inactiveMembers: inactive,
      responsibilities: responsibilityTotal,
      monthTasks: taskTotal,
      pendingTasks,
      completedTasks,
    },
    topPerformers: topPerformers.map((row) => ({
      rank: row.rank,
      overall: row.overall,
      name: row.memberProfile.user.name,
    })),
    positions: positions
      .map((row) => row.designation)
      .filter((value): value is string => Boolean(value)),
  };
}
