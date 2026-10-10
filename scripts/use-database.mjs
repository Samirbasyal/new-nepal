// ========================================
// SWITCH BETWEEN POSTGRESQL AND A LOCAL SQLITE DATABASE
// ========================================
// Run one of these:
//     npm run db:use:sqlite      -> local file database (no account needed)
//     npm run db:use:postgres    -> PostgreSQL (used in production / Vercel)
//
// WHAT IT CHANGES
//   One line in prisma/schema.prisma:
//       provider = "postgresql"   <->   provider = "sqlite"
//
// WHY BOTH ARE SUPPORTED
//   PostgreSQL is right for a real website and for Vercel.
//   SQLite lets you try everything on your own computer in seconds, without
//   creating any cloud account. The database schema deliberately avoids
//   features that only work on one of the two engines, so switching is safe.
// ========================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { heading, stop } from './load-env.mjs';

const target = process.argv[2];

if (target !== 'sqlite' && target !== 'postgres') {
  stop('Please run either  npm run db:use:sqlite  or  npm run db:use:postgres');
}

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

if (!existsSync(schemaPath)) {
  stop('Could not find prisma/schema.prisma. Are you running this from the project folder?');
}

const schema = readFileSync(schemaPath, 'utf8');

const desiredProvider = target === 'sqlite' ? 'sqlite' : 'postgresql';

// Replace only the provider line inside the datasource block.
const updatedSchema = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"(postgresql|sqlite)"/s,
  `$1"${desiredProvider}"`,
);

if (updatedSchema === schema && !schema.includes(`provider = "${desiredProvider}"`)) {
  stop('Could not find the datasource provider line in prisma/schema.prisma.');
}

writeFileSync(schemaPath, updatedSchema, 'utf8');

heading(`Database switched to ${desiredProvider.toUpperCase()}`);

if (target === 'sqlite') {
  console.log(`
  Your project now uses a local file database. No cloud account is needed.

  DO THIS NEXT:

  1. Open the ".env" file and set:

         DATABASE_URL="file:./dev.db"

  2. Create the tables:

         npm run db:push

  3. Create your administrator account:

         npm run admin:create

  4. Start the website:

         npm run dev        then open  http://localhost:3000

  The database file is created at  prisma/dev.db  and is already listed in
  .gitignore, so it will never be uploaded to GitHub.

  IMPORTANT: a file database cannot be used on Vercel. Before you deploy,
  run  npm run db:use:postgres  and set a real DATABASE_URL.
`);
} else {
  console.log(`
  Your project now uses PostgreSQL, which is what Vercel needs.

  DO THIS NEXT:

  1. Open the ".env" file and set DATABASE_URL to your PostgreSQL address,
     for example from Neon, Supabase or Vercel Postgres:

         DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

  2. Create the tables:

         npm run db:push

  3. Create your administrator account:

         npm run admin:create
`);
}
