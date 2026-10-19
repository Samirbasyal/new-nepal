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
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
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
/**
 * ========================================
 * A SECOND, PRIVATE BLOB STORE
 * ========================================
 * A Blob store is created as EITHER public OR private, and Vercel does not let
 * that choice be changed afterwards. Asking for a private file on a public store
 * is refused with:
 *
 *   "Vercel Blob: Cannot use private access on a public store.
 *    The store must be configured with private access."
 *
 * That is the red message a member saw while paying, which is why no receipt
 * ever reached the Admin Panel.
 *
 * The club needs both kinds of file, and one store cannot be both, so this file
 * supports two stores:
 *
 *   the connected store          website photos            (public)
 *   a separate PRIVATE store     receipts + agreements     (private)
 *
 * Until that private store exists the code does NOT fail: a receipt is kept in
 * the connected store under an unguessable name, and the website only ever hands
 * it out through the guarded /api/files/... route. That is private in practice
 * but not private in the strict sense, so creating the store is still the right
 * move - see OPTIONAL UPGRADE at the end of the installer output.
 */
export function isPrivateStoreConfigured(): boolean {
  return Boolean(process.env.PRIVATE_BLOB_STORE_ID || process.env.PRIVATE_BLOB_READ_WRITE_TOKEN);
}

/** Credentials for the separate private store, or an empty object when unset. */
function privateStoreCredentials(): { storeId?: string; token?: string } {
  const credentials: { storeId?: string; token?: string } = {};
  if (process.env.PRIVATE_BLOB_STORE_ID) credentials.storeId = process.env.PRIVATE_BLOB_STORE_ID;
  if (process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) {
    credentials.token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  }
  return credentials;
}

/**
 * How a file that must stay PRIVATE has to be written.
 *
 * A Blob store is created as either PUBLIC or PRIVATE and that choice can never
 * be changed, so a club with a public store cannot simply ask for a private
 * file - Vercel answers "Cannot use private access on a public store".
 *
 * When a separate private store is connected (isPrivateStoreConfigured) the file
 * goes there and only this server can read it back.
 *
 * Otherwise the file is written into the connected store with access 'public' -
 * the only mode that store accepts. It is still kept away from the browser: the
 * address is never rendered, the name is unguessable, and every read goes through
 * the guarded /api/files/... route. Private in practice, but NOT private in the
 * strict sense, which is why connecting a private store is recommended.
 *
 * Both the payment receipt code AND the loan agreement code use these helpers,
 * so the two can never drift apart again.
 */
export type BlobAccessOptions = { access: 'private' | 'public'; storeId?: string; token?: string };

export function privateBlobWriteOptions(): BlobAccessOptions {
  if (isPrivateStoreConfigured()) return { access: 'private', ...privateStoreCredentials() };
  return { access: 'public' };
}

/** The ways a private file may be read back, most likely first. */
export function privateBlobReadAttempts(): BlobAccessOptions[] {
  return [{ access: 'private', ...privateStoreCredentials() }, { access: 'public' }];
}

/**
 * Thrown when the uploaded file itself is not acceptable - wrong type, too big,
 * or empty. The message is written for the person who chose the file, so the
 * upload route is allowed to show it exactly as it is.
 *
 * Storage failures use a different class, so a message written for a developer
 * can never be mistaken for one meant for a member.
 */
export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

/**
 * Turns a storage-provider failure into a sentence a member can act on, and
 * picks the right HTTP status for it.
 *
 * WHY NOT JUST SHOW WHAT VERCEL SAID
 *   A member once attached a payment screenshot and read:
 *     "Vercel Blob: Cannot use private access on a public store."
 *   That explains nothing to them, looks like their own mistake, and hides the
 *   real cause from the club owner. The technical text belongs in the server
 *   log, not on a member's screen.
 */
export function describeStorageFailure(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error ?? '');

  // The store accepts public files, but this file has to be private.
  if (/private access on a public store/i.test(raw)) {
    return {
      status: 500,
      message:
        'This file has to be kept private, but the storage connected to the website is set up for public files only. ' +
        'This is a set-up problem on the server, not a problem with your file. Please tell an administrator.',
    };
  }

  // The store is private, but an ordinary website picture was sent to it.
  if (/public access on a private store/i.test(raw)) {
    return {
      status: 500,
      message:
        'The storage connected to the website only accepts private files, so ordinary website pictures cannot be saved. ' +
        'This is a set-up problem on the server, not a problem with your file. Please tell an administrator.',
    };
  }

  // Bad, missing or expired credentials.
  if (/access denied|forbidden|unauthori[sz]ed|invalid[^.]*token|missing[^.]*token|no token|401|403/i.test(raw)) {
    return {
      status: 500,
      message:
        'The website could not prove it is allowed to save files. This is a set-up problem on the server, ' +
        'not a problem with your file. Please tell an administrator.',
    };
  }

  // The store is full, or the account has been limited.
  if (/quota|limit exceeded|too many requests|429|storage limit/i.test(raw)) {
    return {
      status: 503,
      message:
        'The storage is temporarily full or busy, so this file could not be saved. Please try again a little later, ' +
        'or tell an administrator.',
    };
  }

  return {
    status: 500,
    message:
      'The file could not be saved. Please try again in a moment. If it keeps failing, please tell an administrator.',
  };
}

export function isPersistentStorageConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.PRIVATE_BLOB_STORE_ID ||
      process.env.PRIVATE_BLOB_READ_WRITE_TOKEN,
  );
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

  // UploadValidationError, not a plain Error: the upload route may show THIS
  // message to the person because it is written for them. A storage failure
  // never is.
  if (!extension) {
    throw new UploadValidationError('Only JPG, PNG, WEBP, GIF or SVG images can be uploaded.');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    // The same sentence the browser shows (lib/upload-limits.ts), so a person who
    // gets past the browser check reads the same explanation here.
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new UploadValidationError(
      `Image size exceeds 4 MB. Please upload an image under 4 MB. Your file is ${sizeMb} MB.`,
    );
  }

  if (file.size === 0) {
    throw new UploadValidationError('That file is empty. Please choose the picture again.');
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

    // A private file goes to the separate private store when the club has one.
    // When it does not, the file is stored in the connected store with access
    // 'public' - the only mode that store accepts - so the upload still works
    // and the receipt still reaches the Admin Panel.
    const privateWrite = privateBlobWriteOptions();

    let result: { url: string };
    try {
      result = await put(key, bytes, {
        ...(visibility === 'private' ? privateWrite : { access: 'public' as const }),
        contentType: file.type,
        addRandomSuffix: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // The connected Blob store is PRIVATE, so Vercel refuses a public write.
      // Store the picture privately and hand back the guarded /api/files address
      // instead of a public link. Uploads therefore keep working whichever kind
      // of store the club connected.
      if (!message.toLowerCase().includes('private store')) throw error;

      await put(key, bytes, {
        ...privateWrite,
        contentType: file.type,
        addRandomSuffix: false,
      });

      result = { url: urlForKey(key) };
    }

    return {
      // The address the browser must use, and the one saved in the database.
      //
      // THE FIX
      //   put() uploads the picture and hands back its real, permanent web
      //   address, for example
      //     https://xxxx.public.blob.vercel-storage.com/public/uploads/2026/10/img-123-a1b2.jpg
      //   A PUBLIC picture has to be saved with that address.
      //
      //   Before this fix the address was built as "/uploads/2026/10/....jpg".
      //   That is correct when the file sits inside this project's own public/
      //   folder, which is where a local computer keeps it. On Vercel the file
      //   is in the Blob store instead, so the browser asked the website for a
      //   picture that was never there and the Admin Panel showed a broken
      //   image next to "Preview".
      //
      //   A PRIVATE file is the exact opposite: its Blob address cannot be
      //   opened without the secret token, so it must keep going through the
      //   guarded /api/files/... route.
      url: visibility === 'private' ? urlForKey(key) : result.url || urlForKey(key),
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

    // Try the private store first, then the connected store.
    // Reading both ways means a receipt already on file keeps working even after
    // the private store is created later on.
    const attempts = privateBlobReadAttempts();

    for (const attempt of attempts) {
      try {
        const result = await get(key, {
          access: attempt.access,
          ...(attempt.storeId ? { storeId: attempt.storeId } : {}),
          ...(attempt.token ? { token: attempt.token } : {}),
        });

        if (result && result.stream) {
          return {
            body: result.stream as unknown as ReadableStream,
            contentType: result.blob?.contentType ?? 'application/octet-stream',
          };
        }
      } catch {
        // Not in this store, or not with this access mode. Try the next one.
      }
    }

    return null;
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

// ========================================
// DELETE ONE STORED FILE
// ========================================
// Used when a donation is removed for good: its receipt picture has no other
// owner, so leaving it behind would leave a private financial document in the
// store with nothing pointing at it.
//
// WHAT IS DELETED, AND WHAT IS NOT
//   Only files this website created - the key must contain "/uploads/". A pasted
//   external address (a Google Drive link, say) is left completely alone: deleting
//   somebody else's file because a form contained its address would be vandalism.
//
// THE PRIVATE STORE NEEDS ITS OWN TOKEN
//   A receipt lives in the private store, and that store answers only to
//   PRIVATE_BLOB_READ_WRITE_TOKEN. Deleting it with the public token simply fails,
//   so both are tried in the same order the upload used.
//
// A FAILURE HERE MUST NOT UNDO THE DATABASE WORK
//   The row is already gone by the time this runs. If the store refuses, the
//   caller says so plainly ("the record is deleted, but the picture could not be
//   removed") instead of pretending the whole thing failed.
// ========================================
export type StoredFileDeletion = {
  deleted: boolean;
  /** True when there was nothing to delete in the first place. */
  skipped?: boolean;
  reason?: string;
};

export async function deleteStoredFile(url: string | null | undefined): Promise<StoredFileDeletion> {
  const address = (url ?? '').trim();
  if (address === '') return { deleted: false, skipped: true, reason: 'There was no file to delete.' };

  // ---------- work out the key inside our own storage ----------
  let key: string | null = null;
  let publicBlobUrl: string | null = null;

  if (address.startsWith('/api/files/')) {
    key = address.slice('/api/files/'.length);
  } else if (address.startsWith('/uploads/')) {
    key = 'public' + address;
  } else if (/^https?:\/\//i.test(address)) {
    let host = '';
    try {
      host = new URL(address).hostname;
    } catch {
      return { deleted: false, skipped: true, reason: 'That is not a valid file address.' };
    }

    if (!host.endsWith('.blob.vercel-storage.com')) {
      return { deleted: false, skipped: true, reason: 'This file is not stored by the club.' };
    }

    publicBlobUrl = address;
    const at = address.indexOf('/uploads/');
    key = at >= 0 ? 'public' + address.slice(at) : null;
  }

  if (!key || !key.includes('/uploads/') || key.includes('..')) {
    return { deleted: false, skipped: true, reason: 'This file is not stored by the club.' };
  }

  // ---------- Vercel Blob ----------
  if (isPersistentStorageConfigured()) {
    const { del } = await import('@vercel/blob');
    const privateOptions = privateBlobWriteOptions();

    const attempts: { url: string; token?: string; storeId?: string }[] = [];

    if (publicBlobUrl) {
      attempts.push({ url: publicBlobUrl });
    }

    // A private blob is addressed by its key inside the private store.
    if (key.startsWith('private/')) {
      attempts.push({ url: key, token: privateOptions.token, storeId: privateOptions.storeId });
    }

    // The connected store as a last resort.
    attempts.push({ url: key, token: process.env.BLOB_READ_WRITE_TOKEN });

    let lastError = '';

    for (const attempt of attempts) {
      try {
        await del(attempt.url, {
          ...(attempt.token ? { token: attempt.token } : {}),
          ...(attempt.storeId ? { storeId: attempt.storeId } : {}),
        });

        return { deleted: true };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    return { deleted: false, reason: lastError || 'The storage provider refused to delete the file.' };
  }

  // ---------- Local disk ----------
  try {
    const absolute = path.join(process.cwd(), key);
    await unlink(absolute);
    return { deleted: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Already gone is the result we wanted.
    if (/ENOENT/.test(message)) return { deleted: true, skipped: true };
    return { deleted: false, reason: message };
  }
}
