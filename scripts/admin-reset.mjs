// ========================================
// ADMINISTRATOR RESCUE TOOL (LOST EMAIL OR PASSWORD)
// ========================================
// Run it with:      npm run admin:reset
// Only list accounts: npm run admin:reset -- --list
//
// CHANGE ONLY THE ROLE (the password is left exactly as it is):
//   npm run admin:reset -- --role SUPER_ADMIN
//   npm run admin:reset -- --role FINANCE_ADMIN --email someone@example.com
//
// THE THREE ADMINISTRATOR ROLES
//   ADMIN          - day-to-day work: content, members, recording money in/out.
//   FINANCE_ADMIN  - everything ADMIN can do, plus reports and fund settings.
//   SUPER_ADMIN    - everything, plus APPROVING expenses (one person records a
//                    spend, a Super Administrator approves it).
//   MEMBER         - ordinary member: own data only, no Admin Panel.
// Why it matters: approving an expense requires SUPER_ADMIN, so if the
// "Approve" button seems missing, check the role with --list.
//
// WHEN TO USE THIS
//   - You changed the administrator email and cannot remember the new one.
//   - You cannot sign in to the Admin Panel any more.
//   - You want to see which accounts actually exist in the database.
//
// WHAT IT DOES
//   1. Prints EVERY account in the database (email, role, switched on/off),
//      so you can see what really exists instead of guessing.
//   2. Creates - or repairs - the administrator described in your .env file
//      and gives it a fresh password.
//
// HOW TO USE IT
//   1. Open your .env file.
//   2. Set the two lines you want:
//          ADMIN_EMAIL="you@yourdomain.com"
//          ADMIN_PASSWORD="a-new-long-password-with-numbers-123"
//   3. Run:  npm run admin:reset
//   4. Sign in at /admin/login with those details.
//
// NOTE ABOUT THE 10-MINUTE PAUSE
//   If sign-in was refused with "Too many failed sign-in attempts", your
//   computer was simply paused for a few minutes and nothing is broken.
//   Restarting the website (Ctrl + C then npm run dev) clears that pause
//   immediately, because the counters live in the server's memory.
// ========================================

import { loadEnv, isDatabaseReady, stop, heading } from './load-env.mjs';

loadEnv();

// Loaded after loadEnv() so DATABASE_URL is available.
const { PrismaClient } = await import('@prisma/client');
const bcryptModule = await import('bcryptjs');
const bcrypt = bcryptModule.default ?? bcryptModule;

// ---------- What did the person ask for? ----------
//   --list                     only show the accounts
//   --role SUPER_ADMIN         change just the role (password untouched)
//   --email someone@x.com      which account the --role change applies to
// Both "--role SUPER_ADMIN" and "--role=SUPER_ADMIN" are accepted.
const args = process.argv.slice(2);

const listOnly = args.includes('--list');

/** Read the value that follows a flag, or after an "=" sign. */
function readOption(name) {
  const withEquals = args.find((value) => value.startsWith(`${name}=`));
  if (withEquals) return withEquals.slice(name.length + 1).trim();

  const index = args.indexOf(name);
  if (index === -1) return null;

  const next = args[index + 1];
  return next && !next.startsWith('--') ? next.trim() : null;
}

const ROLE_NAMES = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'MEMBER'];

const requestedRoleRaw = readOption('--role');
const requestedRole = requestedRoleRaw ? requestedRoleRaw.toUpperCase().replace(/[\s-]+/g, '_') : null;

// Which account?  --email wins, otherwise ADMIN_EMAIL from .env.
const requestedEmail = (readOption('--email') || process.env.ADMIN_EMAIL || '').trim().toLowerCase();

heading(requestedRole && !listOnly ? 'Change an account role' : listOnly ? 'Accounts in the database' : 'Administrator rescue tool');

if (!isDatabaseReady()) {
  stop(
    'DATABASE_URL is not set (or is still the placeholder) in your .env file.\n' +
      '    Run  npm run db:use:sqlite  for a local database, or see PROJECT_GUIDE.md section 2.',
  );
}

const prisma = new PrismaClient();

try {
  // ---------- 1. Show every account ----------
  const accounts = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      lastLoginAt: true,
      profile: { select: { status: true } },
    },
  });

  if (accounts.length === 0) {
    console.log('  There are NO accounts in this database yet.');
    console.log('  That is why nobody can sign in - the tables exist but are empty.\n');
    console.log('  Fix it by setting ADMIN_EMAIL and ADMIN_PASSWORD in your .env file');
    console.log('  and running:   npm run admin:reset\n');
  } else {
    console.log(`  ${accounts.length} account(s) found:\n`);
    // ROLE needs enough room for the longest name: FINANCE_ADMIN / SUPER_ADMIN.
    const ROLE_WIDTH = 14;

    console.log(
      '  ' + 'EMAIL'.padEnd(37) + 'ROLE'.padEnd(ROLE_WIDTH) + 'ACTIVE'.padEnd(8) + 'MEMBERSHIP',
    );
    console.log('  ' + '-'.repeat(37 + ROLE_WIDTH + 8 + 10));

    for (const account of accounts) {
      console.log(
        '  ' +
          String(account.email).padEnd(37) +
          String(account.role).padEnd(ROLE_WIDTH) +
          (account.isActive ? 'yes' : 'NO').padEnd(8) +
          String(account.profile?.status ?? '-'),
      );
    }

    // Everybody who is allowed through the Admin Panel door counts, not only
    // the plain ADMIN role - Super Administrators and Finance Administrators
    // can sign in there too.
    const admins = accounts.filter((a) =>
      ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'].includes(a.role),
    );
    console.log('');
    console.log(`  Administrator accounts: ${admins.length}`);

    if (admins.length === 0) {
      console.log('  ⚠  There is no administrator account. You cannot open the Admin Panel.');
      console.log('     Run this script without --list to create one from your .env file.');
    } else {
      console.log('  Sign in with one of the emails above, at /admin/login.');
    }

    const inactive = accounts.filter((a) => !a.isActive);
    if (inactive.length > 0) {
      console.log(
        `  ⚠  ${inactive.length} account(s) are switched OFF and cannot sign in at all.`,
      );
    }
    console.log('');
  }

  if (listOnly) {
    process.exitCode = 0;
  } else if (requestedRole) {
    // ---------- 2. CHANGE ONLY THE ROLE ----------
    // The password is deliberately NOT touched here: a role change should never
    // lock anybody out, and nobody enjoys hunting for a forgotten password.
    if (!ROLE_NAMES.includes(requestedRole)) {
      console.log(`  ✖ "${requestedRoleRaw}" is not a role I know about.`);
      console.log(`    Use one of: ${ROLE_NAMES.join(', ')}\n`);
      process.exitCode = 1;
    } else if (!requestedEmail) {
      console.log('  ✖ Which account? Add  --email you@example.com  or set ADMIN_EMAIL in .env.\n');
      process.exitCode = 1;
    } else {
      const account = await prisma.user.findUnique({
        where: { email: requestedEmail },
        select: { id: true, email: true, role: true },
      });

      if (!account) {
        console.log(`  ✖ There is no account with the email ${requestedEmail}.`);
        console.log('    Look at the list above, then try again.\n');
        process.exitCode = 1;
      } else if (account.role === requestedRole) {
        console.log(`  = ${account.email} already has the role ${requestedRole}. Nothing changed.\n`);
        process.exitCode = 0;
      } else {
        await prisma.user.update({
          where: { id: account.id },
          data: { role: requestedRole, isActive: true },
        });

        console.log(`  ✔ Role changed for ${account.email}`);
        console.log(`      Before : ${account.role}`);
        console.log(`      After  : ${requestedRole}`);
        console.log('      Password: NOT changed');
        console.log('');
        console.log('  IMPORTANT: sign out, then sign in again at /admin/login.');
        console.log('  The old session still remembers the previous role.\n');

        if (requestedRole === 'MEMBER') {
          console.log('  This account can no longer open the Admin Panel.\n');
        } else {
          console.log(`  ${requestedRole} can open the Admin Panel at /admin/login.`);
          if (requestedRole === 'SUPER_ADMIN') {
            console.log('  Super Administrator can also APPROVE expenses and see reports.\n');
          } else {
            console.log('  Remember: only a SUPER_ADMIN can approve an expense.\n');
          }
        }
      }
    }
  } else {
    // ---------- 2. Create or repair the administrator from .env ----------
    const name = (process.env.ADMIN_NAME || 'Site Administrator').trim();
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || !password) {
      console.log('  Nothing was changed, because .env does not contain both values yet.');
      console.log('  Add these two lines to your .env file and run this command again:\n');
      console.log('      ADMIN_EMAIL="you@yourdomain.com"');
      console.log('      ADMIN_PASSWORD="a-new-long-password-with-numbers-123"\n');
      process.exitCode = 0;
    } else if (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      console.log('  ✖ ADMIN_PASSWORD must be at least 12 characters and contain a letter and a number.');
      console.log('    Nothing was changed.\n');
      process.exitCode = 1;
    } else {
      const passwordHash = await bcrypt.hash(password, 12);

      const before = await prisma.user.findUnique({ where: { email }, select: { id: true } });

      const user = await prisma.user.upsert({
        where: { email },
        // The role is deliberately LEFT ALONE for an account that already
        // exists. Repairing a password must never silently downgrade a
        // SUPER_ADMIN or a FINANCE_ADMIN back to ADMIN.
        // Need a different role? Change it on purpose with:
        //     npm run admin:reset -- --role SUPER_ADMIN
        update: { name, passwordHash, isActive: true },
        create: {
          name,
          email,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
          profile: { create: { status: 'ACTIVE', isPublic: false } },
        },
      });

      console.log(`  ✔ ${before ? 'Password replaced for' : 'New administrator created'}: ${user.email}`);
      console.log(`      Role   : ${user.role}`);
      console.log(`      Active : ${user.isActive ? 'yes' : 'no'}`);
      console.log('');
      console.log('  Sign in at  /admin/login');
      console.log('');
      console.log('  If sign-in is still refused, wait a few minutes or restart the website');
      console.log('  (Ctrl + C, then npm run dev) - the attempt counter lives in memory.');
    }
  }
} catch (error) {
  console.error('\n  Could not read or update the database.');
  console.error('  ' + (error instanceof Error ? error.message : error));
  console.error('\n  Have the tables been created yet? Run:  npm run db:push\n');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
