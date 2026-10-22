// ========================================
// TWO-STEP VERIFICATION - THE CODES THEMSELVES (TOTP)
// ========================================
// This is the standard "authenticator app" code: Google Authenticator, Authy,
// Microsoft Authenticator, 1Password and others all speak it. The official name
// is TOTP (time-based one-time password) and the rules are written in RFC 6238.
//
// HOW IT WORKS, IN ONE PARAGRAPH
//   The server gives the administrator a long random SECRET once. Their phone
//   stores it too. Every 30 seconds both sides calculate the same 6-digit number
//   from that secret and the current time - no message is ever sent, nothing
//   needs a phone signal, and the number a thief saw over somebody's shoulder is
//   useless half a minute later.
//
// WHY IT IS WRITTEN BY HAND HERE
//   The algorithm is a handful of lines of HMAC-SHA1. Adding a package for it
//   would mean another dependency to keep patched on a website that lives for
//   years, for less code than the wrapper would take. Nothing here is clever or
//   custom: base32 (RFC 4648) and the RFC 6238 counter are implemented exactly as
//   written, which is what lets any normal authenticator app work.
//
// WHAT THIS DOES NOT PROTECT AGAINST
//   Somebody who has the secret AND the password. That is why the secret is
//   shown exactly once, on the screen where it is created, and stored only in the
//   administrator's own row.
// ========================================

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** RFC 4648 base32, the alphabet every authenticator app understands. */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const DIGITS = 6;
const PERIOD_SECONDS = 30;

// ========================================
// BASE32
// ========================================
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, '');

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of cleaned) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ========================================
// THE SECRET
// ========================================
/**
 * A fresh secret: 20 random bytes (160 bits), which is the length the RFC
 * recommends for SHA-1 based codes and what authenticator apps expect.
 *
 * Returned in base32 because that is what the app's "enter this key" box and the
 * otpauth:// URL both use.
 */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

// ========================================
// THE CODE
// ========================================
/** The 6-digit code for a given moment (default: now). */
export function generateCode(secret: string, atMs: number = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / PERIOD_SECONDS);

  // The counter as a 64-bit big-endian number: the "message" of the HMAC.
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();

  // "Dynamic truncation" - RFC 4226, step 5.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Is this the right code?
 *
 * `window` allows the clock on the phone to be a little out: 1 means the current
 * 30-second step plus one step before and after, which is the usual tolerance.
 * Any more than that and a stolen code stays usable for too long.
 *
 * The comparison is constant-time, so a wrong guess cannot be narrowed down by
 * measuring how long the answer took.
 */
export function verifyCode(secret: string, code: string, window = 1, atMs: number = Date.now()): boolean {
  const cleaned = (code ?? '').replace(/\D/g, '');

  if (cleaned.length !== DIGITS) return false;
  if (!secret) return false;

  const expectedLength = DIGITS;

  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = generateCode(secret, atMs + offset * PERIOD_SECONDS * 1000);

    // Both strings are the same length, so a straight constant-time compare works.
    const a = Buffer.from(candidate.padEnd(expectedLength, '0'));
    const b = Buffer.from(cleaned.padEnd(expectedLength, '0'));

    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }

  return false;
}

// ========================================
// THE LINK FOR THE APP
// ========================================
/**
 * otpauth://totp/... - the text the authenticator app reads.
 *
 * Shown on the screen as a clickable link (and as the raw secret for anyone who
 * prefers to type it). Deliberately no QR image: generating one would mean
 * another dependency, and the link is accepted by tapping it on the phone.
 */
export function otpauthUrl(input: { secret: string; account: string; issuer: string }): string {
  const label = encodeURIComponent(`${input.issuer}:${input.account}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}
