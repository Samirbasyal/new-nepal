// ========================================
// API - IMAGE UPLOAD
// ========================================
// Address: POST /api/upload
//
// WHO MAY UPLOAD
//   Any SIGNED-IN person. That is deliberate and it is the important change:
//
//     * Administrators upload website pictures, member photos, Karya Samiti
//       photos and loan agreements.
//     * MEMBERS upload the screenshot of their payment receipt when they pay
//       their monthly contribution.
//
//   Until this was corrected the endpoint was administrators-only, so a member's
//   receipt was refused with "Forbidden". Because a receipt is required, the
//   member could never finish a payment, which is why nothing ever appeared in
//   the admin approval queue. One permission, two broken features.
//
//   Anonymous visitors still cannot upload, and a member whose email address is
//   not yet verified still cannot (both are enforced by requireMemberApi).
//
// WHERE THE PICTURE GOES
//   Decided in lib/storage.ts, never here: Vercel Blob when a token is
//   configured (permanent), otherwise the local disk while developing. See that
//   file for the full explanation.
//
// SECURITY (all checked on the server, never in the browser)
//   - The uploader must be signed in.
//   - Only real image types are accepted (MIME type allow-list).
//   - The size is limited to 4 MB.
//   - The file name is regenerated, so a hostile name cannot do any harm.
//   - The storage token is read from the environment and never leaves the server.
// ========================================

import { fail, ok } from '@/lib/api/http';
import { requireMemberApi } from '@/lib/api/guard';
import {
  storeImage,
  storageDescription,
  StorageUnavailableError,
  UploadValidationError,
  describeStorageFailure,
  isPersistentStorageConfigured,
  parsePurpose,
} from '@/lib/storage';

export const dynamic = 'force-dynamic';

// A receipt photographed on a phone can take a moment to travel. Give the
// upload more room than the default before the platform cuts it off.
export const maxDuration = 30;

export async function POST(request: Request) {
  // ---------- Who is asking? ----------
  // Any signed-in member or administrator. Anonymous is refused.
  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  // ---------- Read the uploaded picture ----------
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('No picture was received. Please choose the file again.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return fail('Please choose a picture to upload.', 400);
  }

  // ---------- What is it for? ----------
  // The purpose decides whether the file is PUBLIC or PRIVATE, and it is decided
  // from this whitelist rather than trusted blindly. A payment receipt ('receipt')
  // and a loan agreement ('agreement') are stored privately so they cannot be
  // opened by whoever happens to hold the link; website photos stay public.
  const purpose = parsePurpose(form.get('purpose'));

  // ---------- Save it (validation happens inside storeImage) ----------
  try {
    const stored = await storeImage(file, purpose);

    return ok(
      {
        url: stored.url,
        size: stored.size,
        type: stored.type,
        provider: stored.provider,
        // 'private' means the address above goes through the guarded route and
        // only the owner and an administrator can open it.
        visibility: stored.visibility,
        // True when the picture is on permanent storage. The browser shows a
        // warning when it is not, so nobody is surprised later.
        permanent: stored.provider === 'vercel-blob',
      },
      201,
      stored.provider === 'vercel-blob'
        ? 'Picture uploaded and stored permanently.'
        : 'Picture uploaded to this computer only. It will not survive a redeploy - connect Vercel Blob before going live.',
    );
  } catch (error) {
    // ---------- Nowhere permanent to put it ----------
    // 501 means "this server cannot do that yet", which is very different from
    // "your request was wrong". The message tells the owner exactly what to set.
    if (error instanceof StorageUnavailableError) {
      console.error('[upload] no storage configured:', storageDescription());
      return fail(error.message, 501);
    }

    // ---------- The picture itself was not acceptable ----------
    // Our OWN sentence, written for the person who chose the file, so it is safe
    // to show exactly as it is.
    if (error instanceof UploadValidationError) {
      return fail(error.message, 400);
    }

    // ---------- The storage service refused, or is set up wrongly ----------
    // Before this, ANY thrown error was answered with its own message and HTTP
    // 400. That is how a member came to read
    //   "Vercel Blob: Cannot use private access on a public store."
    // which is written for a developer, looks like the member's own mistake, and
    // hides the real cause from the owner. The raw text now goes to the server log
    // and the person gets a sentence they can act on.
    console.error('[upload] storage failure:', error);
    const friendly = describeStorageFailure(error);
    return fail(friendly.message, friendly.status);
  }
}

/**
 * Lets a screen ask "can uploads be kept permanently on this server?" without
 * having to send a picture to find out.
 *
 * Handy for the Admin Panel, which can warn before somebody fills in a whole
 * form and only then discovers that the picture cannot be stored.
 */
export async function GET(request: Request) {
  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  return ok({
    persistent: isPersistentStorageConfigured(),
    storage: storageDescription(),
  });
}
