// ========================================
// API - PICTURES THAT LIVE IN THE BLOB STORE
// ========================================
// Address: /api/public-files/2026/10/img-123-a1b2.jpg
//
// WHY THIS FILE EXISTS
//   A picture uploaded through the Admin Panel is stored in the Vercel Blob
//   store, not inside the website's own public/ folder. Vercel's disk cannot
//   keep files, so this is the only place a new picture can live.
//
//   The database, however, still remembers it as
//       /uploads/2026/10/img-123-a1b2.jpg
//   which is the shape used for the pictures that ARE inside the project. The
//   browser therefore asked the website for a file that is not in the project
//   and showed a broken picture instead.
//
//   next.config.mjs now sends /uploads/... here WHEN the file is not found in
//   the project's own public/ folder. Old pictures keep being served by the web
//   server exactly as before, and new ones are fetched from the Blob store.
//
// REMEMBER
//   These pictures are PUBLIC on purpose - they appear on the public website -
//   so no sign-in is required. Payment receipts never come through here; they
//   go through /api/files/... which checks who is asking.
// ========================================

import { isPersistentStorageConfigured } from '@/lib/storage';

// Never cache the answer itself: the same address always returns the same
// bytes, and the long Cache-Control below is what actually stops the browser
// from asking twice.
export const dynamic = 'force-dynamic';

// One folder, one file, one extension. Nothing else is allowed, so a request
// can never climb out of the uploads folder.
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const MAX_SEGMENTS = 6;

function notFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;

  // ---------- 1. Is the requested address a shape we ever create? ----------
  if (!Array.isArray(path) || path.length === 0 || path.length > MAX_SEGMENTS) {
    return notFound();
  }

  for (const segment of path) {
    // "..", "." and anything with a slash inside is refused before it is used.
    if (!SAFE_SEGMENT.test(segment) || segment === '.' || segment === '..') {
      return notFound();
    }
  }

  // ---------- 2. Is a Blob store connected? ----------
  // On a computer running "npm run dev" there is none, and the picture is
  // already sitting in public/uploads/ - so the web server served it and this
  // route was never reached.
  if (!isPersistentStorageConfigured()) {
    return notFound();
  }

  // ---------- 3. Fetch it from the Blob store ----------
  // The Blob key was written by lib/storage.ts as
  //     public/uploads/2026/10/img-123-a1b2.jpg
  // so the address above is turned back into that key.
  const key = `public/uploads/${path.join('/')}`;

  try {
    const { get } = await import('@vercel/blob');

    // access:'public' - these are the public pictures. A receipt is stored as
    // a private blob and can only be read with the secret token.
    const result = await get(key, { access: 'public' });

    if (!result || !result.stream) return notFound();

    return new Response(result.stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': result.blob?.contentType ?? 'application/octet-stream',
        // The file name contains a random part, so one address always means
        // one picture - it can safely be kept for a year.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    // A missing blob, a wrong token or a network problem all end up as the
    // same honest answer: this picture is not available.
    return notFound();
  }
}
