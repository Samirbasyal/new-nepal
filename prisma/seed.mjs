// ========================================
// SEED SCRIPT - SET UP THE ESSENTIAL DATABASE CONTENT
// ========================================
// Run it with:      npm run db:seed
//
// IT CREATES ONLY TWO THINGS:
//   1. your first administrator account (from the .env file)
//   2. the six beneficiary groups, with NO numbers attached
//
// IT DELIBERATELY CREATES NOTHING ELSE.
//   No programs, no projects, no donors, no impact numbers, no stories.
//   Those are the organization's real information and must be added by the
//   organization itself from the Admin Panel.
//
// WANT TO SEE HOW THE DESIGN LOOKS WITH CONTENT?
//   Run:  npm run db:seed:demo
//   That fills the website with clearly marked "[SAMPLE]" entries that you can
//   review and then delete.
// ========================================

import { loadEnv, isDatabaseReady, stop, heading } from '../scripts/load-env.mjs';

loadEnv();

const { PrismaClient } = await import('@prisma/client');
const bcryptModule = await import('bcryptjs');
const bcrypt = bcryptModule.default ?? bcryptModule;

heading('Setting up the database');

if (!isDatabaseReady()) {
  stop(
    'DATABASE_URL is not set (or is still the placeholder) in your .env file.\n' +
      '    Run  npm run db:use:sqlite  for a quick local database, or read\n' +
      '    PROJECT_GUIDE.md section 2 to connect PostgreSQL.',
  );
}

const prisma = new PrismaClient();

// ========================================
// 1. THE FIRST ADMINISTRATOR ACCOUNT
// ========================================
async function createAdmin() {
  const name = (process.env.ADMIN_NAME || 'Site Administrator').trim();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || password.length < 8) {
    console.log(
      '\n  ! Skipped the administrator account.\n' +
        '    Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file (at least 8 characters)\n' +
        '    and run  npm run admin:create  when you are ready.',
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    console.log(`\n  = The administrator account ${email} already exists - left unchanged.`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      isActive: true,
      profile: { create: { status: 'ACTIVE' } },
    },
  });

  console.log(`\n  ✔ Administrator account created: ${email}`);
}

// ========================================
// 2. THE BENEFICIARY GROUPS
// ========================================
// These are ordinary, broadly recognised groups. They are created WITHOUT any
// numbers, so the website shows a description but no statistic. Add a real
// figure later in Admin Panel -> Beneficiaries if you have one.
const BENEFICIARY_GROUPS = [
  {
    slug: 'youth',
    name: 'Youth',
    iconKey: 'users',
    description:
      'Young people in our community. We support them with learning opportunities, leadership experience and space to take part in decisions.',
    sortOrder: 1,
  },
  {
    slug: 'women',
    name: 'Women',
    iconKey: 'sparkles',
    description:
      'Women and girls. Our work focuses on skills, confidence, health awareness and support for small income activities.',
    sortOrder: 2,
  },
  {
    slug: 'children',
    name: 'Children',
    iconKey: 'book',
    description:
      'Children in our community. We help with educational support, safe activities and encouragement to stay in school.',
    sortOrder: 3,
  },
  {
    slug: 'families',
    name: 'Families',
    iconKey: 'heart',
    description:
      'Households that need a helping hand. We connect families with the programs and services that can support them.',
    sortOrder: 4,
  },
  {
    slug: 'local-communities',
    name: 'Local communities',
    iconKey: 'globe',
    description:
      'The neighbourhoods and villages where we work. Our activities are planned together with local people.',
    sortOrder: 5,
  },
  {
    slug: 'vulnerable-groups',
    name: 'Vulnerable groups',
    iconKey: 'shield-check',
    description:
      'People facing additional difficulties, including older people and those living with a disability or illness.',
    sortOrder: 6,
  },
];

async function createBeneficiaryGroups() {
  const existing = await prisma.beneficiaryCategory.count();

  if (existing > 0) {
    console.log(`\n  = Beneficiary groups already exist (${existing}) - left unchanged.`);
    return;
  }

  for (const group of BENEFICIARY_GROUPS) {
    await prisma.beneficiaryCategory.create({
      data: {
        slug: group.slug,
        name: group.name,
        description: group.description,
        iconKey: group.iconKey,
        sortOrder: group.sortOrder,
        // No beneficiaryCount on purpose: we do not invent statistics.
        isPublished: true,
      },
    });
  }

  console.log(`\n  ✔ ${BENEFICIARY_GROUPS.length} beneficiary groups created (with no numbers).`);
}

// ========================================
// 3. FUND AND EXPENSE CATEGORIES
// ========================================
// These are the ordinary categories a community fund uses. They are plain
// configuration, so creating them is safe and saves a lot of typing in the
// Admin Panel. Everything can be renamed or switched off there.
//
// The "MONTHLY_MEMBER_FUND" category is marked as a system category: the member
// payment form files every monthly contribution under it automatically.
const FUND_CATEGORIES = [
  { slug: 'monthly-member-fund', name: 'Monthly Member Fund', isSystem: true, sortOrder: 1,
    description: 'The regular monthly contribution paid by every member.' },
  { slug: 'donation', name: 'Donation', isSystem: false, sortOrder: 2,
    description: 'General donations from supporters and well-wishers.' },
  { slug: 'event-fund', name: 'Event Fund', isSystem: false, sortOrder: 3,
    description: 'Money collected for a specific event or programme.' },
  { slug: 'emergency-fund', name: 'Emergency Fund', isSystem: false, sortOrder: 4,
    description: 'Reserved for urgent help such as disaster response.' },
  { slug: 'charity-fund', name: 'Charity Fund', isSystem: false, sortOrder: 5,
    description: 'Money set aside to help people in need.' },
  { slug: 'special-contribution', name: 'Special Contribution', isSystem: false, sortOrder: 6,
    description: 'One-off contributions for a stated purpose.' },
  { slug: 'other', name: 'Other', isSystem: false, sortOrder: 7,
    description: 'Anything that does not fit the categories above.' },
];

const EXPENSE_CATEGORIES = [
  'Event', 'Office', 'Equipment', 'Transportation', 'Food',
  'Salary', 'Maintenance', 'Charity', 'Emergency', 'Other',
];

async function createFundCategories() {
  const existingFund = await prisma.fundCategory.count();
  const existingExpense = await prisma.expenseCategory.count();

  if (existingFund > 0 || existingExpense > 0) {
    console.log('\n  = Fund/expense categories already exist - left unchanged.');
    return;
  }

  for (const category of FUND_CATEGORIES) {
    await prisma.fundCategory.create({ data: category });
  }

  for (const [index, name] of EXPENSE_CATEGORIES.entries()) {
    await prisma.expenseCategory.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sortOrder: index + 1,
        isActive: true,
      },
    });
  }

  console.log(
    `\n  ✔ ${FUND_CATEGORIES.length} fund categories and ${EXPENSE_CATEGORIES.length} expense categories created.`,
  );
}

// ========================================
// 4. KARYA SAMITI (कार्य समिति) POSITIONS
// ========================================
// अध्यक्ष, उपाध्यक्ष, सचिव, सह-सचिव, कोषाध्यक्ष, सदस्य.
//
// These are only the usual six. The organization can rename them, reorder them
// or add any other position from  Admin Panel -> Karya Samiti -> Committee posts.
// This function never renames or deletes a position that already exists, so
// running the seed again is always safe.
const KARYA_POSTS = [
  { name: 'अध्यक्ष', nameEn: 'Chairperson', sortOrder: 1 },
  { name: 'उपाध्यक्ष', nameEn: 'Vice Chairperson', sortOrder: 2 },
  { name: 'सचिव', nameEn: 'Secretary', sortOrder: 3 },
  { name: 'सह–सचिव', nameEn: 'Joint Secretary', sortOrder: 4 },
  { name: 'कोषाध्यक्ष', nameEn: 'Treasurer', sortOrder: 5 },
  { name: 'सदस्य', nameEn: 'Member', sortOrder: 6 },
];

async function createKaryaPosts() {
  let created = 0;

  for (const post of KARYA_POSTS) {
    const existing = await prisma.karyaSamitiPost.findUnique({ where: { name: post.name } });
    if (existing) continue;

    await prisma.karyaSamitiPost.create({
      data: { name: post.name, nameEn: post.nameEn, sortOrder: post.sortOrder, isActive: true },
    });

    created += 1;
  }

  if (created === 0) {
    console.log('\n  = Committee positions already exist - left unchanged.');
  } else {
    console.log(`\n  ✔ ${created} committee position(s) created.`);
  }
}

// ========================================
// 5. SAFETY DEFAULTS FOR THE FUND SETTINGS
// ========================================
// The monthly member contribution is Rs. 20, due on the 15th of each month.
//
// We only overwrite a value that is still the OLD shipped default (1000 / 10).
// A number the organization has deliberately chosen is never touched.
async function applyFundDefaults() {
  const wanted = [
    { key: 'fund.monthlyAmount', from: '1000', to: '20', label: 'monthly fund amount' },
    { key: 'fund.dueDay', from: '10', to: '15', label: 'due day' },
    // Public registration is CLOSED. Members are created by an administrator.
    { key: 'join.registrationEnabled', from: 'true', to: 'false', label: 'public registration' },
  ];

  const changed = [];

  for (const item of wanted) {
    const row = await prisma.siteSetting.findUnique({ where: { key: item.key } });

    if (!row) {
      // Nothing saved yet: the code default (lib/settings.ts) already applies.
      continue;
    }

    if (row.value.trim() === item.from) {
      await prisma.siteSetting.update({ where: { key: item.key }, data: { value: item.to } });
      changed.push(`${item.label}: ${item.from} -> ${item.to}`);
    }
  }

  if (changed.length === 0) {
    console.log('\n  = Fund / registration settings already up to date.');
  } else {
    console.log(`\n  ✔ Updated: ${changed.join(', ')}`);
  }
}

// ========================================
// RUN
// ========================================
try {
  await createAdmin();
  await createBeneficiaryGroups();
  await createFundCategories();
  await createKaryaPosts();
  await applyFundDefaults();

  console.log(`
  ============================================================
  Done. What next?

  1. Start the website:      npm run dev
  2. Sign in as administrator:  http://localhost:3000/admin/login
  3. Open Admin Panel -> Settings and replace the "[Add ...]"
     placeholders with your real organization information.
  4. Add your first program, project, event or news item.

  To see the design filled with clearly marked sample content:
      npm run db:seed:demo
  ============================================================
`);
} catch (error) {
  console.error('\n  The seed script failed.');
  console.error(error instanceof Error ? error.message : error);
  console.error('\n  Have you created the tables yet? Run:  npm run db:push\n');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
