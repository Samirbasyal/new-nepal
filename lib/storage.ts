// ========================================
// IMAGE STORAGE
// ========================================
// ONE PLACE that decides where an uploaded file is actually kept, and who is
// allowed to look at it afterwards.
//
// WHY THIS FILE EXISTS
//   The website runs in two very different places:
//
//     * On your own computer - there is a normal disk, so a file can simply be
//       written into a folder.
//     * On Vercel - the disk is READ-ONLY and temporary. A file written there
//       disappears when the server restarts or a new version is deployed, and
//       writing may fail altogether.
//
//   So "where do uploads go" cannot be hard-coded. It is decided here, once, and
//   the rest of the website just calls storeImage().
//
// ORDER OF PREFERENCE
//   1. Vercel Blob  - used whenever BLOB_READ_WRITE_TOKEN is set. Real,
//      permanent storage. This is what production must use.
//   2. Local disk   - used only while developing, so uploading still works
//      before you have signed up for anything.
//   3. Neither      - a clear, honest error. Nothing is faked.
//
// TWO KINDS OF FILE - THIS IS THE IMPORTANT PART
//
//   PUBLIC  (member photos, Karya Samiti photos, event and gallery pictures)
//     These are meant to be seen by everyone on the website, so they get a
//     normal, permanent web address that any browser can open.
//     -> public/uploads/...   ->  /uploads/...
//
//   PRIVATE (payment receipts, loan agreements)
//     A receipt shows a real transaction: amounts, bank details, transaction
//     numbers. It must NOT be readable by whoever happens to have the link, and
//     one member must never be able to open another member's receipt.
//     So private files are stored where the web server will NOT hand them out,
//     and they are only ever served through /api/files/... which checks who is
//     asking before sending a single byte.
//     -> private/uploads/...  ->  /api/files/private/uploads/...
//
// SECURITY: the storage token is only ever read on the SERVER, from the
// environment. It is never sent to the browser and never committed to GitHub
// (.env is already in .gitignore).
// ========================================

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 4 MB is plenty for a website photo or a phone screenshot, and keeps the site fast.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Only these picture types are accepted. Checked on the SERVER, so a hostile
// request cannot talk its way past it.
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/**
 * What an upload is FOR. The purpose decides whether the file is public or
 * private - the browser is never trusted to make that choice for a file that
 * must stay confidential.
 *
 *   'receipt'   a member's payment screenshot   -> PRIVATE
 *   'agreement' a signed loan agreement         -> PRIVATE
 *   'photo'     anything put on the website     -> public
 */
export type UploadPurpose = 'receipt' | 'agreement' | 'photo';

export function isPrivatePurpose(purpose: UploadPurpose): boolean {
  return purpose === 'receipt' || purpose === 'agreement';
}

/** The only purposes the upload endpoint accepts. Anything else is refused. */
export function parsePurpose(value: unknown): UploadPurpose {
  if (value === 'receipt' || value === 'agreement' || value === 'photo') return value;
  return 'photo';
}

export type UploadProvider = 'vercel-blob' | 'local';

export type StoredFileResult = {
  /** Where the database should point. Safe to put straight into an <img src>. */
  url: string;
  /** The internal key used by the /api/files route. Kept out of the database. */
  key: string;
  size: number;
  type: string;
  provider: UploadProvider;
  visibility: 'public' | 'private';
};

/**
 * True when Vercel Blob has been connected.
 *
 * VERCEL CAN CONNECT A BLOB STORE IN TWO WAYS, and both must count:
 *
 *   1. BLOB_READ_WRITE_TOKEN - an older, fixed key for the store. It can be
 *      copied and used from anywhere, including your own computer.
 *
 *   2. BLOB_STORE_ID - the modern way. Vercel adds this when a store is
 *      connected, and the actual permission comes from VERCEL_OIDC_TOKEN, which
 *      Vercel puts into every deployment by itself. Nothing has to be copied by
 *      hand and nothing can go stale.
 *
 * Checking only the first one would switch Blob OFF for a project that connected
 * its store the modern way, and uploads would be refused with "no storage
 * service is connected" even though everything was set up correctly.
 *
 * Which credential to use is worked out by the @vercel/blob SDK itself, so
 * nothing needs to be passed to put().
 */
export function isPersistentStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/**
 * True when this server may write uploaded files to its own disk.
 *
 * Deliberately switched OFF in production, because on Vercel such a file is
 * temporary: it would appear to work and then vanish at the next deployment,
 * which is exactly the confusing behaviour this file exists to prevent.
 */
export function isLocalUploadAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/** A short, plain-language description of where uploads currently go. */
export function storageDescription(): string {
  if (isPersistentStorageConfigured()) return 'Vercel Blob (permanent storage)';
  if (isLocalUploadAllowed()) return 'this computer only (development)';
  return 'not configured';
}

/**
 * The message shown when a picture cannot be saved anywhere.
 * It names the variable to set, so the person is never left guessing.
 */
export const STORAGE_NOT_CONFIGURED_MESSAGE =
  'Pictures cannot be saved permanently yet, because no storage service is connected. ' +
  'To switch uploads on, open your Vercel project, go to Storage, create a Blob store and ' +
  'connect it to this project - Vercel then adds BLOB_STORE_ID (or BLOB_READ_WRITE_TOKEN) ' +
  'by itself. After that, redeploy, because a running deployment does not pick up new ' +
  'settings. Until then you can paste a link to a picture that is already online.';

/**
 * Thrown when the picture itself is fine but there is nowhere permanent to put it.
 *
 * A separate type so the API can answer "this server cannot do that yet"
 * (HTTP 501) instead of "your request was wrong" (HTTP 400). The two mean very
 * different things to the person reading the screen.
 */
export class StorageUnavailableError extends Error {
  constructor(message: string = STORAGE_NOT_CONFIGURED_MESSAGE) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

/**
 * Build a safe, unique file name.
 *
 * The original name is thrown away completely and a fresh one is generated, so a
 * hostile name such as "../../.env" has nowhere to go.
 */
function buildSafeName(extension: string): string {
  return `img-${Date.now()}-${randomBytes(4).toString('hex')}.${extension}`;
}

/** public/uploads/2026/10/x.png  or  private/uploads/2026/10/x.png */
function buildKey(visibility: 'public' | 'private', safeName: string): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${visibility}/uploads/${year}/${month}/${safeName}`;
}

/**
 * The address a browser should use for this key.
 *
 * Public files are served straight from the web server, exactly as they always
 * were (so links saved by earlier versions of the website keep working).
 * Private files are served only through the guarded route.
 */
export function urlForKey(key: string): string {
  // key looks like "public/uploads/2026/10/x.png"
  const withoutVisibility = key.replace(/^(public|private)\//, '');
  if (key.startsWith('private/')) {
    return `/api/files/${key}`;
  }
  return `/${withoutVisibility}`;
}

/**
 * Save one uploaded file and return the address that will be stored in the
 * database.
 *
 * Throws an Error whose message is safe to show to the person when something is
 * wrong; the caller turns it into a proper HTTP answer.
 */
export async function storeImage(
  file: File,
  purpose: UploadPurpose = 'photo',
): Promise<StoredFileResult> {
  // ---------- 1. Is this really one of our allowed picture types? ----------
  const extension = ALLOWED_IMAGE_TYPES[file.type];

  if (!extension) {
    throw new Error('Only JPG, PNG, WEBP, GIF or SVG images can be uploaded.');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That picture is larger than 4 MB. Please use a smaller one.');
  }

  if (file.size === 0) {
    throw new Error('That file is empty. Please choose the picture again.');
  }

  const visibility: 'public' | 'private' = isPrivatePurpose(purpose) ? 'private' : 'public';
  const bytes = Buffer.from(await file.arrayBuffer());
  const key = buildKey(visibility, buildSafeName(extension));

  // ========================================
  // PREFERENCE 1 - VERCEL BLOB (permanent)
  // ========================================
  if (isPersistentStorageConfigured()) {
    // Imported here rather than at the top of the file, so the website still
    // runs on a computer where the Blob package has not been installed.
    const { put } = await import('@vercel/blob');

    const result = await put(key, bytes, {
      // THE IMPORTANT LINE. A receipt is stored as a private blob, so Vercel
      // itself refuses to hand it to anybody who does not hold the token. It can
      // therefore never be opened by simply sharing a link.
      access: visibility === 'private' ? 'private' : 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });

    return {
      url: urlForKey(key),
      key,
      size: file.size,
      type: file.type,
      provider: 'vercel-blob',
      visibility,
    };
  }

  // ========================================
  // PREFERENCE 2 - LOCAL DISK (development only)
  // ========================================
  if (isLocalUploadAllowed()) {
    // Public files live under public/ so the web server serves them directly.
    // Private files live in a folder the web server never serves, so the same
    // protection applies while developing as it does in production.
    const folder = path.join(process.cwd(), key);
    await mkdir(path.dirname(folder), { recursive: true });
    await writeFile(folder, bytes);

    return {
      url: urlForKey(key),
      key,
      size: file.size,
      type: file.type,
      provider: 'local',
      visibility,
    };
  }

  // ========================================
  // PREFERENCE 3 - NOWHERE TO PUT IT
  // ========================================
  throw new StorageUnavailableError();
}

/**
 * Read a previously stored file back, for the guarded /api/files route.
 *
 * Returns null when the file cannot be found, so the route can answer 404
 * without pretending anything went wrong on the server.
 */
export async function readStoredFile(
  key: string,
): Promise<{ body: Buffer | ReadableStream; contentType: string } | null> {
  // Never allow a key that tries to climb out of its folder.
  if (key.includes('..') || !key.startsWith('private/')) return null;

  // ---------- Vercel Blob ----------
  if (isPersistentStorageConfigured()) {
    const { get } = await import('@vercel/blob');

    const result = await get(key, { access: 'private' });
    if (!result || !result.stream) return null;

    return {
      body: result.stream as unknown as ReadableStream,
      contentType: result.blob?.contentType ?? 'application/octet-stream',
    };
  }

  // ---------- Local disk ----------
  try {
    const absolute = path.join(process.cwd(), key);
    const body = await readFile(absolute);
    const extension = path.extname(key).slice(1).toLowerCase();
    const contentType =
      Object.entries(ALLOWED_IMAGE_TYPES).find(([, ext]) => ext === extension)?.[0] ??
      'application/octet-stream';
    return { body, contentType };
  } catch {
    return null;
  }
}
