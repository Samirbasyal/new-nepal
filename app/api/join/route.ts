// ========================================
// API - JOIN COMMUNITY FORM
// ========================================
// Address: POST /api/join   (public - no login needed)
//
// Receives the "Join Community" application, validates it and stores it in
// the "join_applications" table.
//
// PRIVACY
//   The stored application is NEVER shown on the public website. It can only
//   be read from Admin Panel -> Join applications, which requires the ADMIN
//   role.
//
// SPAM PROTECTION
//   - A hidden "honeypot" box: real people do not see it, robots fill it in.
//   - A limit on how many applications one address may send per hour.
// ========================================

import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { joinApplicationSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const blockedFor = blockedForMinutes(`join:${ip}`);
  if (blockedFor > 0) {
    return fail(blockMessage(blockedFor), 429);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = joinApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const data = parsed.data;

  // ---------- Honeypot check ----------
  // The hidden box must be empty. Anything in it means "robot", so we pretend
  // the submission succeeded without saving anything.
  if (data.website && data.website.trim() !== '') {
    recordFailure(`join:${ip}`);
    return ok({ saved: false }, 200, 'Thank you. Your application has been received.');
  }

  try {
    const application = await prisma.joinApplication.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email ?? null,
        address: data.address ?? null,
        areaOfInterest: data.areaOfInterest ?? null,
        message: data.message ?? null,
        extraInfo: data.extraInfo ?? null,
        status: 'NEW',
      },
      select: { id: true },
    });

    recordSuccess(`join:${ip}`);

    // A short line in the admin activity log so the team notices new applications.
    await prisma.activityLog
      .create({
        data: {
          action: 'CREATE',
          entity: 'Join application',
          entityId: application.id,
          detail: data.fullName,
        },
      })
      .catch(() => undefined);

    return ok(
      { id: application.id },
      201,
      'Thank you. Our team has received your application and will contact you soon.',
    );
  } catch (error) {
    console.error('[join] could not save application:', error);
    recordFailure(`join:${ip}`);
    return fail('We could not save your application right now. Please try again shortly.', 500);
  }
}
