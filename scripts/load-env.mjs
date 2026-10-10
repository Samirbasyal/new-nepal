// ========================================
// SMALL .env LOADER FOR THE COMMAND LINE SCRIPTS
// ========================================
// Next.js reads your .env file automatically, but plain "node script.mjs"
// files do not. This helper reads .env (and .env.local) so the scripts in this
// folder can find DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL and so on.
//
// It is only a few lines of code on purpose - no extra library to install.
// ========================================

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function loadEnv() {
  // ".env.local" wins over ".env", the same order Next.js uses.
  const files = ['.env.local', '.env'];

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, 'utf8');

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      // Skip blank lines and comments.
      if (!line || line.startsWith('#')) continue;

      const equals = line.indexOf('=');
      if (equals === -1) continue;

      const key = line.slice(0, equals).trim();
      let value = line.slice(equals + 1).trim();

      // Remove surrounding quotes if present.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Do not overwrite values that are already set in the environment
      // (this is what a hosting provider such as Vercel does).
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

/** Is the database address a real one, or still the shipped placeholder? */
export function isDatabaseReady() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) return false;
  if (url.includes('USER:PASSWORD@HOST')) return false;
  return true;
}

/** Print a clear, friendly error and stop the script. */
export function stop(message) {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

/** Print a heading so the terminal output is easy to read. */
export function heading(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}
