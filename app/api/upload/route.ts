// ========================================
// API - IMAGE UPLOAD (ADMIN ONLY)
// ========================================
// Address: POST /api/upload
//
// Lets an administrator upload a picture instead of pasting a link.
//
// HOW IT WORKS
//   - While developing on your own computer, files are saved into
//     public/uploads/  and the returned address looks like
//     /uploads/2026/05/photo-3f9a2c.jpg
//
//   - On Vercel the file system is READ-ONLY, so uploading a file there is
//     not possible with this simple approach. In that case the endpoint
//     answers with a clear explanation and the administrator can simply paste
//     a link to an image that is already online.
//
//     WANT UPLOADS ON VERCEL TOO? The easiest options are:
//       * Vercel Blob  (https://vercel.com/docs/storage/vercel-blob)
//       * Supabase Storage
//     Add your storage provider in the marked place below and keep the same
//     answer shape, so no other file has to change.
//
// SECURITY
//   - Only administrators may upload (requireAdminApi).
//   - Only real image types are accepted.
//   - The file size is limited.
//   - The file name is regenerated, so a hostile file name cannot do harm.
// ========================================

import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail, ok } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';

// 4 MB is plenty for a website photo and keeps the site fast.
const MAX_BYTES = 4 * 1024 * 1024;

// Only these picture types are accepted.
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export async function POST(request: Request) {
  // ---------- Authorization: administrators only ----------
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  // ---------- Read the uploaded file ----------
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('No file was received.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return fail('Please choose a file to upload.', 400);
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return fail('Only JPG, PNG, WEBP, GIF or SVG images can be uploaded.', 415);
  }

  if (file.size > MAX_BYTES) {
    return fail('That image is larger than 4 MB. Please use a smaller picture.', 413);
  }

  // ========================================
  // BUILD A SAFE FILE NAME
  // ========================================
  // We ignore the original name completely and generate our own, so a
  // malicious file name cannot escape the uploads folder.
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const safeName = `img-${Date.now()}-${randomBytes(4).toString('hex')}.${extension}`;

  // ========================================
  // SAVE THE FILE (local development)
  // ========================================
  const folder = path.join(process.cwd(), 'public', 'uploads', year, month);
  const publicUrl = `/uploads/${year}/${month}/${safeName}`;

  try {
    await mkdir(folder, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(folder, safeName), bytes);

    return ok(
      {
        url: publicUrl,
        size: file.size,
        type: file.type,
      },
      201,
      'Image uploaded. Remember to save the form to keep the change.',
    );
  } catch (error) {
    console.error('[upload] could not write the file:', error);

    // ========================================
    // PRODUCTION MESSAGE (for example on Vercel)
    // ========================================
    // When the file system is read-only we explain the alternatives instead
    // of showing a confusing error.
    return fail(
      'Uploading files is not possible on this hosting plan. ' +
        'Please paste a link to an image that is already online, or connect a storage ' +
        'service such as Vercel Blob or Supabase Storage (see the notes in app/api/upload/route.ts).',
      501,
    );
  }
}
