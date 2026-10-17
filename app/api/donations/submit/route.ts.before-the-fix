// ========================================
// API - SUBMIT A DONATION FOR VERIFICATION (STEP 4 + 5)
// ========================================
// Address: POST /api/donations/submit   (public - no login needed)
// Body:    multipart/form-data
//            reference       the donation id handed out at step 3
//            amount          whole rupees
//            method          BANK_TRANSFER | ESEWA
//            transactionRef  optional
//            receipt         the screenshot file
//
// THE MOST IMPORTANT RULE ON THIS PAGE
//   A click never means "paid". Clicking submit only means "the donor says they
//   paid, please check". Money is confirmed by an administrator in Donation
//   Management, and only then does the record become VERIFIED. Nothing in this
//   file can set a donation to VERIFIED.
//
// WHY THE PICTURE IS UPLOADED HERE, AND NOT THROUGH /api/upload
//   /api/upload requires a signed-in member with a verified email. A donor is a
//   visitor with no account, so it would always answer 403. Opening that
//   endpoint to the public would also weaken an existing feature.
//
//   Instead the picture is sent with this form and stored by this route, which:
//     - only works while the donation is still INITIATED (so it cannot be used
//       to dump anonymous files into the store), and
//     - writes the address ITSELF, so a donor can never point "receipt" at
//       somebody else's file.
//   It is stored with purpose "receipt": private, served only through the
//   guarded /api/files/... route.
//
// WHY IT REFUSES SOMETIMES RATHER THAN OVERWRITING
//   - Already PENDING  -> 409, so a double click cannot submit the same gift twice
//   - Already VERIFIED -> 409, a finished record cannot be changed
//   - Already REJECTED -> 409, the donor must contact the office
// ========================================

import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { fail, ok } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import {
  donationSubmitSchema,
  methodRequiresReceipt,
  PUBLIC_PAYMENT_METHODS,
} from '@/lib/donation/publicSchemas';
import { storeImage, StorageUnavailableError, UploadValidationError } from '@/lib/storage';
import { formatMoney } from '@/lib/utils';
import { notifyAdmins } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const blockedFor = blockedForMinutes(`donation-submit:${ip}`);
  if (blockedFor > 0) {
    return fail(blockMessage(blockedFor), 429);
  }

  // ---------- Read the form ----------
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('The form could not be read. Please try again.', 400);
  }

  const parsed = donationSubmitSchema.safeParse({
    reference: form.get('reference'),
    amount: form.get('amount'),
    method: form.get('method'),
    transactionRef: form.get('transactionRef'),
    website: form.get('website'),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first?.message ?? 'Please check the details you entered.', 422);
  }

  const data = parsed.data;

  if (data.website && String(data.website).trim() !== '') {
    recordFailure(`donation-submit:${ip}`);
    return fail('The form could not be sent. Please try again.', 422);
  }

  const receipt = form.get('receipt');
  const hasReceipt = receipt instanceof File && receipt.size > 0;

  if (methodRequiresReceipt(data.method) && !hasReceipt) {
    return fail('Please attach a photo or screenshot of your payment.', 422);
  }

  try {
    // ---------- The donation must still be waiting to be paid ----------
    const donation = await prisma.donation.findFirst({
      where: { id: data.reference, isDeleted: false },
      select: { id: true, status: true, donorName: true, purpose: true },
    });

    if (!donation) {
      return fail('That donation reference was not found. Please start again.', 404);
    }

    if (donation.status === 'PENDING') {
      return fail(
        'This donation has already been submitted and is waiting for verification. There is no need to send it again.',
        409,
      );
    }

    if (donation.status === 'VERIFIED') {
      return fail(
        'This donation has already been verified and approved. Thank you. Please contact the office if you think this is a mistake.',
        409,
      );
    }

    if (donation.status === 'REJECTED') {
      return fail(
        'This donation was not approved, so it cannot be submitted again. Please contact the office for help.',
        409,
      );
    }

    if (donation.status !== 'INITIATED') {
      return fail('This donation cannot be submitted in its current state.', 409);
    }

    // ---------- Store the picture, privately ----------
    // storeImage checks the file type and the size and throws our own
    // UploadValidationError with a sentence a donor can act on.
    let receiptUrl: string | null = null;

    if (hasReceipt && receipt instanceof File) {
      const stored = await storeImage(receipt, 'receipt');
      receiptUrl = stored.url;
    }

    const method = PUBLIC_PAYMENT_METHODS.find((option) => option.value === data.method);

    const updated = await prisma.donation.update({
      where: { id: donation.id },
      data: {
        amount: data.amount,
        method: data.method,
        reference: data.transactionRef,
        receiptUrl,
        // The donor has now told us when they paid. An administrator still has to
        // confirm the money actually arrived before this becomes VERIFIED.
        receivedOn: new Date(),
        status: 'PENDING',
      },
      select: { id: true, status: true },
    });

    recordSuccess(`donation-submit:${ip}`);

    await prisma.activityLog
      .create({
        data: {
          action: 'UPDATE',
          entity: 'Donation',
          entityId: donation.id,
          detail: `Submitted for verification - ${donation.donorName} - ${formatMoney(data.amount)} - ${method?.label ?? data.method}`,
        },
      })
      .catch(() => undefined);

    // ---------- Tell the office, so nothing waits unnoticed ----------
    await notifyAdmins({
      title: 'New donation submitted for verification',
      message: `${donation.donorName} - ${formatMoney(data.amount)} - ${donation.purpose ?? 'General donation'} (${method?.label ?? data.method})`,
      type: 'INFO',
      link: '/admin/donations',
    });

    return ok(
      { reference: updated.id, status: updated.status },
      201,
      'Thank you. Your donation has been submitted and is waiting for verification.',
    );
  } catch (error) {
    // The file itself was wrong (too big, wrong type, empty). Our own words.
    if (error instanceof UploadValidationError) {
      return fail(error.message, 422);
    }

    if (error instanceof StorageUnavailableError) {
      return fail(
        'The website cannot store pictures at the moment, so your receipt could not be saved. Please try again later or contact the office.',
        503,
      );
    }

    console.error('[donation-submit] could not submit:', error);
    recordFailure(`donation-submit:${ip}`);
    return fail('We could not submit your donation right now. Please try again shortly.', 500);
  }
}
