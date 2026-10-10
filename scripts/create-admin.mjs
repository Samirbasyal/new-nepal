// ========================================
// CREATE THE FIRST SECURE ADMINISTRATOR ACCOUNT
// ========================================
// Run it with:      npm run admin:create
//
// WHERE THE DETAILS COME FROM
//   Your .env file:
//       ADMIN_NAME      = "Site Administrator"
//       ADMIN_EMAIL     = "admin@example.com"
//       ADMIN_PASSWORD  = "a-long-strong-password"
//
// WHAT IT DOES
//   1. Checks that the database is reachable.
//   2. Checks the password is strong enough.
//   3. Hashes the password with bcrypt (the real password is never stored).
//   4. Creates the account with role = ADMIN.
//      If the email already exists, the password and role are updated instead.
//
// IMPORTANT
//   There is no "admin / admin" account anywhere in this project. You must run
//   this command yourself, with your own password.
// ========================================

import { loadEnv, isDatabaseReady, stop, heading } from './load-env.mjs';

loadEnv();

// Loaded after loadEnv() so DATABASE_URL is available.
const { PrismaClient } = await import('@prisma/client');
const bcryptModule = await import('bcryptjs');
const bcrypt = bcryptModule.default ?? bcryptModule;

heading('Create an administrator account');

// ---------- 1. Is the database configured? ----------
if (!isDatabaseReady()) {
  stop(
    'DATABASE_URL is not set (or is still the placeholder) in your .env file.\n' +
      '    See PROJECT_GUIDE.md section 2 for how to connect a database, or run:\n' +
      '      npm run db:use:sqlite   (for a local file database)',
  );
}

// ---------- 2. Read and check the details ----------
const name = (process.env.ADMIN_NAME || 'Site Administrator').trim();
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';

if (!email) {
  stop('ADMIN_EMAIL is empty in your .env file. Add a real email address for the administrator.');
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  stop(`ADMIN_EMAIL ("${email}") does not look like a valid email address.`);
}

const problems = [];
if (password.length < 12) problems.push('use at least 12 characters');
if (!/[A-Za-z]/.test(password)) problems.push('include at least one letter');
if (!/[0-9]/.test(password)) problems.push('include at least one number');

// These are the passwords everybody tries first. Refuse them outright.
const FORBIDDEN = ['admin', 'admin123', 'password', 'password123', '12345678', 'administrator'];
if (FORBIDDEN.includes(password.toLowerCase())) {
  problems.push('this password is too easy to guess');
}

if (problems.length > 0) {
  stop(
    'ADMIN_PASSWORD is not strong enough:\n' +
      problems.map((problem) => `    - ${problem}`).join('\n') +
      '\n\n    Create a strong password with this command:\n' +
      '      node -e "console.log(require(\'crypto\').randomBytes(18).toString(\'base64url\'))"',
  );
}

// ---------- 3. Create or update the account ----------
const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      // Every account gets a member profile so the panel has somewhere to
      // store designation, department and so on.
      profile: { create: { status: 'ACTIVE', isPublic: false } },
    },
  });

  console.log(`\n  ✔ ${existing ? 'Updated' : 'Created'} administrator account`);
  console.log(`      Name  : ${user.name}`);
  console.log(`      Email : ${user.email}`);
  console.log(`      Role  : ${user.role}`);
  console.log(`\n  Sign in at:  /admin/login`);
  console.log('\n  Next steps:');
  console.log('    1. Sign in and change the password (Member Panel → My profile → Change password)');
  console.log('       or simply keep it only in your .env file.');
  console.log('    2. Consider removing ADMIN_PASSWORD from your .env file afterwards.');
  console.log('    3. Never commit your .env file to GitHub.\n');
} catch (error) {
  console.error('\n  Could not create the administrator account.');
  console.error(error instanceof Error ? error.message : error);
  console.error(
    '\n  Have you created the database tables yet? Run:  npm run db:push\n',
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
