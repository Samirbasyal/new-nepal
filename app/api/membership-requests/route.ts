// ========================================
// API - ASK TO JOIN THE CLUB
// ========================================
// Address: POST /api/membership-requests
//
// WHO MAY CALL IT
//   Anybody. This is the public registration form, so there is no session to
//   check - which is exactly why every rule below is enforced here, on the
//   server, and not in the browser.
//
// WHAT IT DOES
//   1. Reads the form (multipart, so a profile photo can travel with it).
//   2. Validates every field with the shared schema.
//   3. Stores the photo, if one was chosen (public storage - see lib/storage.ts).
//   4. Writes ONE row with status PENDING.
//   5. Tells every administrator through the existing notification system.
//
// WHAT IT DELIBERATELY DOES NOT DO
//   - It does not create a user account.
//   - It does not create a password.
//   - It does not sign anybody in.
//   - It does not approve anything.
//   A pending applicant therefore has nothing to log in with, which is the whole
//   point of the approval step.
//
// SPAM
//   A light per-address limit (5 requests an hour) plus the same honeypot pattern
//   the public forms use. This is a speed bump, not a guarantee - see the honest
//   note in lib/auth/rate-limit.ts about counters living in memory.
// ========================================

import { fail, ok } from '@/lib/api/http';
import { isDatabaseConfigured } from '@/lib/prisma';
import { clientKey } from '@/lib/auth/rate-limit';
import { storeImage, StorageUnavailableError, UploadValidationError, describeStorageFailure } from '@/lib/storage';
import { membershipRequestSchema } from '@/lib/membership/schemas';
import { createRequest, MEMBERSHIP_REQUEST_SUCCESS_MESSAGE } from '@/lib/membership/service';
import { notifyAdmins } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// The sentence the applicant sees when everything worked. It lives in
// lib/membership/service.ts so the API and the form cannot drift apart.
const SUCCESS_MESSAGE = MEMBERSHIP_REQUEST_SUCCESS_MESSAGE;

// ---------- simple in-memory limiter ----------
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const submissions = new Map<string, number[]>();

function tooManyRequests(key: string): boolean {
  const now = Date.now();
  const recent = (submissions.get(key) ?? []).filter((time) => now - time < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    submissions.set(key, recent);
    return true;
  }

  recent.push(now);
  submissions.set(key, recent);

  // Keep the map from growing for ever on a long-running server.
  if (submissions.size > 5000) submissions.clear();

  return false;
}

/** Read the submitted values as plain strings, whichever way the form arrived. */
async function readSubmission(
  request: Request,
): Promise<{ values: Record<string, string>; photo: File | null } | null> {
  const contentType = request.headers.get('content-type') ?? '';

  // ---------- multipart (the normal case: the form may include a photo) ----------
  if (contentType.includes('multipart/form-data')) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return null;
    }

    const values: Record<string, string> = {};
    for (const key of [
      'fullName',
      'email',
      'mobileNumber',
      'currentAddress',
      'dateOfBirth',
      'occupation',
      'reasonForJoining',
      'requestLetter',
      'agree',
      'website', // honeypot
    ]) {
      const value = form.get(key);
      if (typeof value === 'string') values[key] = value;
    }

    const photo = form.get('photo');
    return { values, photo: photo instanceof File && photo.size > 0 ? photo : null };
  }

  // ---------- JSON (a script, or a browser without JavaScript) ----------
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const values: Record<string, string> = {};

    for (const [key, value] of Object.entries(body ?? {})) {
      if (typeof value === 'string') values[key] = value;
      else if (typeof value === 'boolean') values[key] = String(value);
    }

    return { values, photo: null };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  if (ip && tooManyRequests(`membership:${ip}`)) {
    return fail(
      'Too many requests were sent from this connection. Please try again in an hour, or contact the office directly.',
      429,
    );
  }

  const submission = await readSubmission(request);
  if (!submission) {
    return fail('The form could not be read. Please fill it in again.', 400);
  }

  const { values, photo } = submission;

  // ---------- Honeypot ----------
  // Real people never see this box, so anything typed into it came from a robot.
  // We answer as if it worked, so the robot does not learn how to get through.
  if ((values.website ?? '').trim() !== '') {
    return ok({ id: null }, 201, SUCCESS_MESSAGE);
  }

  // ---------- Validate ----------
  const parsed = membershipRequestSchema.safeParse(values);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fields[key]) fields[key] = issue.message;
    }

    return fail('Please check the highlighted fields and try again.', 422, fields);
  }

  // ---------- Store the photo (optional) ----------
  let profilePhotoUrl: string | null = null;

  if (photo) {
    try {
      const stored = await storeImage(photo, 'photo');
      profilePhotoUrl = stored.url;
    } catch (error) {
      // The photo is optional, so a storage problem must not throw the whole
      // application away - but the applicant is told plainly that it was not kept.
      if (error instanceof UploadValidationError) {
        return fail(error.message, 400, { profilePhoto: error.message });
      }

      if (error instanceof StorageUnavailableError) {
        console.error('[membership] no storage configured for the profile photo:', error.message);
        return fail(
          'Your photo could not be saved because the website has no permanent picture storage yet. ' +
            'Please remove the photo and send the form again, or contact the office.',
          503,
          { profilePhoto: 'The photo could not be saved.' },
        );
      }

      console.error('[membership] profile photo upload failed:', error);
      const friendly = describeStorageFailure(error);
      return fail(friendly.message, friendly.status, { profilePhoto: friendly.message });
    }
  }

  // ---------- Save the request ----------
  const created = await createRequest({
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    mobileNumber: parsed.data.mobileNumber,
    currentAddress: parsed.data.currentAddress,
    dateOfBirth: parsed.data.dateOfBirth,
    occupation: parsed.data.occupation,
    reasonForJoining: parsed.data.reasonForJoining,
    requestLetter: parsed.data.requestLetter,
    profilePhotoUrl,
  });

  if (!created.ok) {
    return fail(created.message, 409, created.fields);
  }

  // ---------- Tell the office ----------
  // In-app only. The bell keeps this after a refresh and after signing in again,
  // because it is a row in the database, not a toast.
  void notifyAdmins({
    title: 'New membership request',
    message: `${parsed.data.fullName} (${parsed.data.email}) has asked to join the club.`,
    type: 'INFO',
    link: `/admin/member-requests?request=${created.id}`,
  }).catch(() => undefined);

  return ok({ id: created.id }, 201, SUCCESS_MESSAGE);
}
