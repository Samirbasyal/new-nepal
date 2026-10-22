// ========================================
// API - MONTHLY PERFORMANCE OF ONE MEMBER
// ========================================
// Address: /api/admin/members/<memberId>/performance
//
//   GET    list every month saved for this member
//   POST   save one month   { periodMonth, workQuality, taskCompletion,
//                             participation, responsibility, teamwork, remarks }
//   PATCH  publish a month  { periodMonth }   -> fills ranks for the whole month
//
// NO SCORE IS INVENTED
//   A score is stored only when the administrator typed one. The overall score
//   is the weighted average of the parts that were filled in, and ranks are
//   recalculated for every member of that month when it is published.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, readJson, serverError } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import {
  isValidMonth,
  publishMonth,
  saveEvaluation,
  SCORE_KEYS,
  type ScoreKey,
} from '@/lib/members/service';

export const dynamic = 'force-dynamic';

type Body = {
  periodMonth?: string;
  remarks?: string | null;
} & Partial<Record<ScoreKey, number | null>>;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;

  try {
    const evaluations = await prisma.performanceEvaluation.findMany({
      where: { memberProfileId: id },
      orderBy: { periodMonth: 'desc' },
    });
    return ok({ evaluations });
  } catch (error) {
    return serverError(error, 'Could not load the performance history.');
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const body = (await readJson(request)) as Body | null;

  if (!isValidMonth(body?.periodMonth)) {
    return fail('Choose the month you are evaluating.', 422, {
      periodMonth: 'Choose the month you are evaluating.',
    });
  }

  const scores: Partial<Record<ScoreKey, number>> = {};
  for (const key of SCORE_KEYS) {
    const raw = body?.[key];
    if (raw === null || raw === undefined || raw === ('' as unknown)) continue;
    const value = Number(raw);
    if (Number.isNaN(value)) {
      return fail('Scores must be numbers.', 422, { [key]: 'Scores must be numbers.' });
    }
    if (value < 0 || value > 100) {
      return fail('Scores must be between 0 and 100.', 422, {
        [key]: 'Scores must be between 0 and 100.',
      });
    }
    scores[key] = value;
  }

  if (Object.keys(scores).length === 0) {
    return fail('Enter at least one score before saving.', 422);
  }

  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!profile) return fail('That member was not found.', 404);

    const evaluation = await saveEvaluation({
      memberProfileId: id,
      periodMonth: body!.periodMonth!,
      scores,
      remarks: body?.remarks ?? null,
      adminId: auth.user.id,
    });

    return ok({ evaluation }, 200, 'Evaluation saved as a draft.');
  } catch (error) {
    return serverError(error, 'Could not save the evaluation.');
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  const { id } = await params;
  const body = (await readJson(request)) as Body | null;

  if (!isValidMonth(body?.periodMonth)) {
    return fail('Which month should be published?', 422);
  }

  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!profile) return fail('That member was not found.', 404);

    const ranks = await publishMonth(body!.periodMonth!);

    return ok(
      { published: ranks.size },
      200,
      'Results published. Members can now see their score and rank.'
    );
  } catch (error) {
    return serverError(error, 'Could not publish the results.');
  }
}
