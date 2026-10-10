// ========================================
// DATABASE
// This file creates the connection to the database.
// Every page and API route imports "prisma" from here to read/write data.
// ========================================
//
// HOW IT WORKS (simple version)
//   prisma.program.findMany()   -> read all programs
//   prisma.program.create(...)  -> add a new program
//   prisma.program.update(...)  -> change an existing program
//   prisma.program.delete(...)  -> remove a program
//
// The database address comes from the DATABASE_URL value in the .env file.
// The table definitions live in: prisma/schema.prisma
// ========================================

import { PrismaClient } from '@prisma/client';

// In development Next.js reloads the code on every save. Without this block
// each reload would open a NEW database connection and the database would
// soon refuse the connections ("too many clients").
// We store the client on "globalThis" so it is created only once.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Show slow/errored queries in the terminal while developing.
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ========================================
// SMALL DATABASE HELPERS
// ========================================

/**
 * Is the database configured at all?
 * Used by pages so they can show a friendly message instead of crashing
 * when the .env file still contains the placeholder DATABASE_URL.
 */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) return false;
  // The value that ships in .env.example is not a real connection string.
  if (url.includes('USER:PASSWORD@HOST')) return false;
  return true;
}

/**
 * Run a database query and return a fallback value if the database is
 * not reachable yet. This keeps the public website readable while the
 * organization is still setting up the database.
 */
export async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  if (!isDatabaseConfigured()) return fallback;
  try {
    return await query();
  } catch (error) {
    console.error('[database] query failed:', error);
    return fallback;
  }
}
