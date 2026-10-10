// ========================================
// AUTHENTICATION - LOGIN RATE LIMITING
// ========================================
// Stops somebody from guessing passwords by trying thousands of combinations.
//
// HOW IT WORKS
//   Every failed login is counted per email address and per IP address.
//   After too many failures the address is blocked for a short cool-down
//   period.
//
// HONEST LIMITATION (please read)
//   The counters live in the memory of the running server. On Vercel each
//   server instance keeps its own counters, so this slows an attacker down
//   but is not a complete shield. For very high security, replace this file
//   with a service such as Upstash Redis - the rest of the code does not need
//   to change.
// ========================================

type Attempt = {
  count: number;
  /** When the cool-down ends (milliseconds since 1970). */
  blockedUntil: number;
};

const attempts = new Map<string, Attempt>();

// How many failures are allowed before the cool-down starts.
const MAX_ATTEMPTS = 8;
// How long the cool-down lasts.
const BLOCK_MINUTES = 10;
// Old counters are cleaned up after this long so the map cannot grow forever.
const ATTEMPT_TTL_MINUTES = 30;

/**
 * Where the request came from (used as part of the limit key).
 *
 * Returns null when the address cannot be determined reliably. That happens
 * while developing on your own computer, because there is no proxy in front of
 * the server to add an address header.
 *
 * WHY null MATTERS (this was a bug once)
 *   If we used a fixed word such as "unknown" instead, every sign-in attempt
 *   made on that computer would share ONE counter. Eight typos - from any
 *   account - would then lock out the whole machine for ten minutes, and even
 *   the correct password would be refused. Returning null means the per-email
 *   limit still protects each account, but the machine-wide limit is only used
 *   when we really know the address (which is always the case on Vercel).
 */
export function clientKey(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');

  const candidate = forwarded?.split(',')[0]?.trim() || real?.trim() || '';

  // No address at all, or an address that only ever belongs to the machine
  // running the website (loopback and home/office networks) -> skip the
  // machine-wide limit. Those addresses are used while developing, and they
  // are shared by everybody on that network, so counting them would lock the
  // whole office out because of one person's typos.
  if (!candidate || isLocalOrPrivateAddress(candidate)) return null;

  return candidate;
}

/**
 * Is this address a loopback or private address?
 *
 *   127.0.0.1, ::1                 -> this computer (development)
 *   10.x.x.x                       -> private network
 *   172.16.x.x ... 172.31.x.x      -> private network
 *   192.168.x.x                    -> home / office network
 *
 * A real visitor on the internet never has one of these addresses, so on Vercel
 * the machine-wide limit is always active.
 */
function isLocalOrPrivateAddress(address: string): boolean {
  const value = address.toLowerCase().replace(/^::ffff:/, '');

  if (value === '::1' || value === 'localhost') return true;
  if (value.startsWith('127.')) return true;
  if (value.startsWith('10.')) return true;
  if (value.startsWith('192.168.')) return true;

  const match = /^172\.(\d{1,3})\./.exec(value);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

function pruneOldEntries() {
  const now = Date.now();
  for (const [key, value] of attempts.entries()) {
    const ageMinutes = (now - (value.blockedUntil || now)) / 60000;
    if (value.count === 0 && ageMinutes > ATTEMPT_TTL_MINUTES) {
      attempts.delete(key);
    }
  }
}

/** Is this key currently blocked? Returns the remaining minutes, or 0. */
export function blockedForMinutes(key: string): number {
  const entry = attempts.get(key);
  if (!entry) return 0;
  const remaining = entry.blockedUntil - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / 60000);
}

/**
 * Remember one failed attempt.
 *
 * Returns the number of minutes this key is now blocked for, or 0 when it is
 * still allowed to try again. Returning the value lets the login page tell the
 * visitor straight away, instead of them having to guess why the next attempt
 * failed too.
 */
export function recordFailure(key: string): number {
  pruneOldEntries();

  const entry = attempts.get(key) ?? { count: 0, blockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_MINUTES * 60000;
    // Reset the counter so the next window starts clean.
    entry.count = 0;
    attempts.set(key, entry);
    return BLOCK_MINUTES;
  }

  attempts.set(key, entry);
  return 0;
}

/** How many attempts are left before the cool-down starts (for messages). */
export function attemptsLeft(key: string): number {
  const entry = attempts.get(key);
  if (!entry) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - entry.count);
}

/** Clear the counter after a successful login. */
export function recordSuccess(key: string): void {
  attempts.delete(key);
}

/** The message shown to a blocked visitor. */
export function blockMessage(minutes: number): string {
  return `Too many failed sign-in attempts. Please wait ${minutes} minute${
    minutes === 1 ? '' : 's'
  } and try again.`;
}
