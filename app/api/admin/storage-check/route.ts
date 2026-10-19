// ========================================
// STORAGE DIAGNOSTIC (admin only)
// ========================================
// Address: GET /api/admin/storage-check
//
// WHY
//   When a photo upload fails, the screen says only "Something went wrong". That
//   hides the one sentence that matters ("no token", "private store", ...). This
//   endpoint performs a REAL tiny write to the configured store and reports the
//   exact answer, so the cause can be found in seconds.
//
// SAFETY
//   - administrators only
//   - writes one 17-byte test file, then deletes it
//   - never returns the token itself, only whether it exists
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { ok } from '@/lib/api/http';
import { isPersistentStorageConfigured, storeImage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const report: Record<string, unknown> = {
    publicToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    privateToken: Boolean(process.env.PRIVATE_BLOB_READ_WRITE_TOKEN),
    privateStoreId: Boolean(process.env.PRIVATE_BLOB_STORE_ID),
    persistentStorage: isPersistentStorageConfigured(),
    upload: 'not tried',
  };

  try {
    // A real 1x1 PNG - the smallest thing that must survive the same code path
    // as a gallery photo.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const file = new File([png], 'storage-check.png', { type: 'image/png' });
    const stored = await storeImage(file, 'photo');

    report.upload = 'ok';
    report.provider = stored.provider;
    report.url = stored.url;
  } catch (error) {
    report.upload = 'failed';
    report.error = error instanceof Error ? error.message : String(error);
  }

  return ok(report);
}
