// ========================================
// AUTHENTICATION - PASSWORD SECURITY
// ========================================
// This file turns a real password into a "hash" before it is saved in the
// database, and checks a typed password against a stored hash.
//
// WHY HASHING?
//   A hash cannot be turned back into the original password. If somebody
//   ever reads the database they still cannot log in as anybody.
//   This is why we NEVER store plain text passwords.
//
// bcrypt also adds a random "salt" to every password, so two members with
// the same password end up with completely different hashes.
// ========================================

import bcrypt from 'bcryptjs';

// How much work bcrypt does. 12 is a good balance of safety and speed
// on a normal server. Higher = safer but slower.
const BCRYPT_ROUNDS = 12;

/** Turn a plain password into a safe hash (used when creating/changing a password). */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/** Check a typed password against the stored hash. Returns true when it matches. */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
  if (!plainPassword || !storedHash) return false;
  try {
    return await bcrypt.compare(plainPassword, storedHash);
  } catch {
    return false;
  }
}

/**
 * Basic password strength rules, used by the registration form and by the
 * Admin Panel when creating a member account.
 * Returns a list of problems; an empty list means the password is accepted.
 */
export function checkPasswordStrength(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push('Use at least 8 characters.');
  if (!/[A-Za-z]/.test(password)) problems.push('Include at least one letter.');
  if (!/[0-9]/.test(password)) problems.push('Include at least one number.');
  return problems;
}

/** A long, random password generator (handy for the create-admin script). */
export function generateStrongPassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
