// ========================================
// API - START A DONATION (STEP 2 + 3)
// ========================================
// Address: POST /api/donations/draft   (public - no login needed)
//
// WHAT IT DOES
//   Takes the chosen purpose and the donor's details, and writes a donation
//   record in the state INITIATED. That row is the "draft" the next steps build
//   on: without it, an amount entered on the payment page would be attached to
//   nothing, and a refresh would lose the whole journey.
//
// WHY THE AMOUNT IS ZERO HERE
//   The donor has not chosen an amount yet. Writing a guess would be inventing
//   money that was never promised. The amount is set in /api/donations/submit.
//
// WHY THE STATUS IS SET BY THE SERVER
//   "status" is never read from the request body. A donor cannot start a
//   donation that is already approved.
//
// THIS DOES NOT TOUCH THE MEMBER FUND
//   It writes one row in "donations". The monthly NPR 20 payments live in
//   "fund_payments" and are not read or written here.
// ========================================

import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { donationDraftSchema, fullPhoneNumber } from '@/lib/donation/publicSchemas';
import { purposeForStorage } from '@/lib/donation/purposes';
import { getCurrentDonor } from '@/lib/donor/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  // ---------- Slow down anybody hammering this endpoint ----------
  const ip = clientKey(request);
  const blockedFor = blockedForMinutes(`donation-draft:${ip}`);
  if (blockedFor > 0) {
    return fail(blockMessage(blockedFor), 429);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = donationDraftSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const data = parsed.data;

  // ---------- Honeypot (same idea as the contact form) ----------
  if (data.website && data.website.trim() !== '') {
    recordFailure(`donation-draft:${ip}`);
    return fail('The form could not be sent. Please try again.', 422);
  }

  // ========================================
  // WHO IS GIVING - AND IT IS NOT OPTIONAL
  // ========================================
  // Since part 6 the donation journey starts only after a donor has registered
  // and confirmed their email, so there is no such thing as an anonymous draft
  // any more. If this cookie is missing or no longer valid, the browser is
  // replaying an old tab: refusing is the honest answer.
  //
  // The id comes from the SIGNED COOKIE and is re-read from the database inside
  // getCurrentDonor(), never from the form - a browser must not be able to
  // attach a gift to somebody else's history.
  const donor = await getCurrentDonor();

  if (!donor) {
    return fail('Please sign in again - your donor session has ended.', 401);
  }

  if (!donor.emailVerified) {
    return fail('Please confirm your email address before donating.', 403);
  }

  const donorAccountId = donor.id;

  try {
    const donation = await prisma.donation.create({
      data: {
        donorName: data.donorName,
        donorEmail: data.donorEmail,
        donorPhone: fullPhoneNumber(data.countryCode, data.phone),
        donorAccountId,
        donationType: 'ONE_TIME',
        purpose: purposeForStorage(data.purpose, data.purposeDetail),
        // INITIATED = started but no money promised yet. Only the submit step
        // can move it to PENDING, and only an administrator can reach VERIFIED.
        status: 'INITIATED',
        amount: 0,
        currency: 'NPR',
        method: 'BANK_TRANSFER',
        note: data.message,
        receivedOn: new Date(),
      },
      select: { id: true },
    });

    recordSuccess(`donation-draft:${ip}`);

    await prisma.activityLog
      .create({
        data: {
          action: 'CREATE',
          entity: 'Donation',
          entityId: donation.id,
          detail: `Initiated - ${data.donorName} - ${purposeForStorage(data.purpose, data.purposeDetail)}`,
        },
      })
      .catch(() => undefined);

    // The id is the donor's reference from here on. It is a cuid: unique and
    // unguessable, so a tracking link cannot be walked through by guessing.
    return ok(
      { reference: donation.id },
      201,
      'Saved. Now choose the amount and how you would like to pay.',
    );
  } catch (error) {
    console.error('[donation-draft] could not save:', error);
    recordFailure(`donation-draft:${ip}`);
    return fail('We could not start your donation right now. Please try again shortly.', 500);
  }
}
