// ========================================
// IMAGE UPLOAD RULES (shared by browser and server)
// ========================================
// ONE place that says how big a picture may be and which kinds are accepted.
//
// The server rule lives in lib/storage.ts (MAX_UPLOAD_BYTES) and is the one that
// actually protects the website. This file is imported by the forms too, so the
// person is told immediately - before a 30 second upload - that the file is too
// big, and sees exactly the same words in both places.
//
// 4 MB per image. It is plenty for a website photo or a phone screenshot and it
// keeps the pages fast.
// ========================================

/** 4 MB, in bytes. Same value as MAX_UPLOAD_BYTES in lib/storage.ts. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const MAX_IMAGE_MB = 4;

/** The exact sentence the organization asked to show. */
export const IMAGE_TOO_LARGE_MESSAGE =
  'Image size exceeds 4 MB. Please upload an image under 4 MB.';

/** File types the server accepts (kept in step with lib/storage.ts). */
export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;

/** Value for the <input type="file" accept="..."> attribute. */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_MIME.join(',');

/** "5.2 MB" - used so the person understands why the file was refused. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ImageCheck = { ok: true } | { ok: false; error: string };

/**
 * Check a chosen file in the browser.
 *
 * Returns a sentence written for the person who chose the file. The server checks
 * the same things again - a browser check can always be skipped by an attacker.
 */
export function checkImageFile(file: File): ImageCheck {
  if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    return {
      ok: false,
      error: 'Only JPG, PNG, WEBP, GIF or SVG images can be uploaded. Please choose a different file.',
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      // The required sentence first, then the real size so nobody is guessing.
      error: `${IMAGE_TOO_LARGE_MESSAGE} Your file is ${formatFileSize(file.size)}.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, error: 'That file is empty. Please choose the picture again.' };
  }

  return { ok: true };
}
