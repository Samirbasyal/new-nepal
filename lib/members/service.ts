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
    select: { id: true, overall: true },
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
