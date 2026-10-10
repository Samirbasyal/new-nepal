// ========================================
// DEMO SEED - SAMPLE CONTENT FOR REVIEWING THE DESIGN
// ========================================
// Run it with:      npm run db:seed:demo
// Remove it with:   npm run db:seed:demo -- --clean
//
// ========================================
// PLEASE READ THIS FIRST
// ========================================
// This script creates SAMPLE entries so you can see how the finished website
// looks with content in it. It is for looking at the design, nothing else.
//
//   * EVERY headline starts with "[SAMPLE]" so it can never be mistaken for
//     real information.
//   * NO statistics, amounts, registrations, awards or success stories are
//     invented. The only numbers used are obviously generic placeholders.
//   * Delete everything before the website goes live, either with
//       npm run db:seed:demo -- --clean
//     or one by one in the Admin Panel.
//
// Real information must be added by the organization itself.
// ========================================

import { loadEnv, isDatabaseReady, stop, heading } from '../scripts/load-env.mjs';

loadEnv();

const { PrismaClient } = await import('@prisma/client');

const prisma = new PrismaClient();

// Every sample entry is marked with this prefix.
const TAG = '[SAMPLE]';

const shouldClean = process.argv.includes('--clean');

// ========================================
// CLEAN UP
// ========================================
async function clean() {
  heading('Removing all [SAMPLE] content');

  const deleted = {
    programs: (await prisma.program.deleteMany({ where: { title: { startsWith: TAG } } })).count,
    projects: (await prisma.project.deleteMany({ where: { title: { startsWith: TAG } } })).count,
    events: (await prisma.event.deleteMany({ where: { title: { startsWith: TAG } } })).count,
    news: (await prisma.newsPost.deleteMany({ where: { title: { startsWith: TAG } } })).count,
    albums: (await prisma.galleryAlbum.deleteMany({ where: { title: { startsWith: TAG } } })).count,
    donors: (await prisma.donor.deleteMany({ where: { name: { startsWith: TAG } } })).count,
    sections: (
      await prisma.contentSection.deleteMany({ where: { title: { startsWith: TAG } } })
    ).count,
  };

  for (const [name, count] of Object.entries(deleted)) {
    console.log(`  ✔ Removed ${count} sample item(s) from "${name}"`);
  }

  console.log('\n  Sample content removed. Your real content was not touched.\n');
}

// ========================================
// CREATE THE SAMPLE CONTENT
// ========================================
async function seedDemo() {
  heading('Adding [SAMPLE] content so you can review the design');

  // ---------- 1. Content sections (About page + Women Empowered) ----------
  const existingSections = await prisma.contentSection.count({
    where: { title: { startsWith: TAG } },
  });

  if (existingSections === 0) {
    await prisma.contentSection.createMany({
      data: [
        {
          slug: 'who-we-are',
          title: `${TAG} Who we are`,
          group: 'ABOUT',
          sortOrder: 1,
          body:
            'This is placeholder text showing where your own introduction will appear.\n\n' +
            'Replace it in Admin Panel → Content sections. Write plainly about who your members are, when the club was formed and what you set out to do.',
          bulletList:
            'Registered community organization\nBased in our local area\nRun by members, for the community',
        },
        {
          slug: 'vision',
          title: `${TAG} Our vision`,
          group: 'ABOUT',
          sortOrder: 2,
          body:
            'A short statement describing the community you want to see in the future. One or two sentences is usually enough.',
        },
        {
          slug: 'mission',
          title: `${TAG} Our mission`,
          group: 'ABOUT',
          sortOrder: 3,
          body:
            'A short statement describing what the organization does every day to work towards that vision.',
        },
        {
          slug: 'objectives',
          title: `${TAG} Our objectives`,
          group: 'ABOUT',
          sortOrder: 4,
          body: 'The practical aims the organization works towards.',
          bulletList:
            'Support children and young people in education\nImprove health awareness in the community\nSupport women with skills and income activities\nEncourage young people to take part in community decisions\nKeep our local environment clean and safe',
        },
        {
          slug: 'core-values',
          title: `${TAG} Core values`,
          group: 'ABOUT',
          sortOrder: 5,
          bulletList: 'Equality and dignity\nHonesty and transparency\nCommunity participation\nVolunteering and service',
        },
        {
          slug: 'what-we-do',
          title: `${TAG} What we do`,
          group: 'ABOUT',
          sortOrder: 6,
          body: 'A short description of the day-to-day activities of the organization.',
        },
        {
          slug: 'our-approach',
          title: `${TAG} Our approach`,
          group: 'ABOUT',
          sortOrder: 7,
          body: 'How the organization works: planning with local people, carrying out activities together, and reviewing what happened afterwards.',
        },
        {
          slug: 'women-empowered',
          title: `${TAG} Women empowered`,
          subtitle: 'Skills, confidence and a voice in the community',
          group: 'WOMEN',
          sortOrder: 1,
          body:
            'Placeholder introduction for the Women Empowered page.\n\n' +
            'Describe the training, awareness activities and support your organization provides for women and girls, and what has changed as a result.',
          bulletList: 'Skills training\nHealth awareness sessions\nSupport for small income activities\nLeadership and confidence building',
        },
      ],
    });
    console.log('  ✔ Content sections created (About page + Women Empowered)');
  } else {
    console.log('  = Content sections already exist - skipped');
  }

  // ---------- 2. One sample project (used by the sample programs below) ----------
  const project = await prisma.project.upsert({
    where: { slug: 'sample-community-development' },
    update: {},
    create: {
      slug: 'sample-community-development',
      title: `${TAG} Community development project`,
      kind: 'PROJECT',
      category: 'Community development',
      summary:
        'A sample project entry showing how a project is presented, with objectives, activities, results and impact.',
      description:
        'This is placeholder text. Replace it in Admin Panel → Projects & Our Works.\n\n' +
        'Describe what the project set out to do, who was involved, where it took place and what happened.',
      objectives: 'Encourage local participation\nImprove the local environment\nStrengthen community links',
      activities: 'Community meetings\nAwareness activities\nPractical work days',
      results: 'Placeholder result - replace with a real result once you have one.',
      impact: 'Placeholder impact statement - replace with what actually changed.',
      beneficiaries:
        'Placeholder text describing who took part. Do not write a number here unless the organization has verified it.',
      location: 'Local area',
      status: 'ONGOING',
      isPublished: true,
      featured: true,
      sortOrder: 1,
    },
  });

  // ---------- 3. Sample programs ----------
  const programCount = await prisma.program.count({ where: { title: { startsWith: TAG } } });

  if (programCount === 0) {
    await prisma.program.createMany({
      data: [
        {
          slug: 'sample-learning-support',
          title: `${TAG} Learning support program`,
          category: 'Education',
          summary: 'A sample program entry for education activities.',
          description:
            'Placeholder description. Explain what the program offers, who takes part and how often it runs.',
          objectives: 'Support students with their studies\nProvide learning materials\nEncourage regular school attendance',
          results: 'Placeholder result - replace with a real one.',
          targetGroup: 'Students',
          location: 'Local area',
          status: 'ONGOING',
          isPublished: true,
          featured: true,
          sortOrder: 1,
          projectId: project.id,
        },
        {
          slug: 'sample-health-awareness',
          title: `${TAG} Health awareness program`,
          category: 'Health',
          summary: 'A sample program entry for health activities.',
          description: 'Placeholder description for a health awareness program.',
          objectives: 'Increase health awareness\nOrganise community health activities',
          targetGroup: 'Local community',
          location: 'Local area',
          status: 'PLANNED',
          isPublished: true,
          featured: true,
          sortOrder: 2,
        },
        {
          slug: 'sample-women-skills',
          title: `${TAG} Women skills and livelihood program`,
          category: 'Women empowerment',
          summary: 'A sample program entry showing how a women-focused program looks.',
          description: 'Placeholder description for skills and livelihood activities with women.',
          objectives: 'Provide practical skills training\nSupport small income activities',
          targetGroup: 'Women',
          location: 'Local area',
          status: 'ONGOING',
          isPublished: true,
          featured: true,
          sortOrder: 3,
        },
      ],
    });
    console.log('  ✔ 3 sample programs created');
  } else {
    console.log('  = Sample programs already exist - skipped');
  }

  // ---------- 4. Sample "Our Works" entries ----------
  const workCount = await prisma.project.count({
    where: { title: { startsWith: TAG }, kind: 'WORK' },
  });

  if (workCount === 0) {
    await prisma.project.createMany({
      data: [
        {
          slug: 'sample-cleanliness-drive',
          title: `${TAG} Cleanliness drive`,
          kind: 'WORK',
          category: 'Environment',
          summary: 'A sample "Our Work" entry.',
          description: 'Placeholder description of a cleanliness activity carried out with local people.',
          objectives: 'Clean public areas\nRaise awareness about waste',
          activities: 'Clean-up day\nAwareness talks',
          location: 'Local area',
          status: 'COMPLETED',
          isPublished: true,
          sortOrder: 1,
        },
        {
          slug: 'sample-youth-sports',
          title: `${TAG} Youth sports activity`,
          kind: 'WORK',
          category: 'Youth',
          summary: 'A sample "Our Work" entry for a sports activity.',
          description: 'Placeholder description of a sports activity organised for young people.',
          location: 'Local area',
          status: 'COMPLETED',
          isPublished: true,
          sortOrder: 2,
        },
      ],
    });
    console.log('  ✔ 2 sample "Our Works" entries created');
  } else {
    console.log('  = Sample works already exist - skipped');
  }

  // ---------- 5. Sample events ----------
  const eventCount = await prisma.event.count({ where: { title: { startsWith: TAG } } });

  if (eventCount === 0) {
    // One in the future (so it appears under "Upcoming") and one in the past.
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    await prisma.event.createMany({
      data: [
        {
          slug: 'sample-community-meeting',
          title: `${TAG} Community meeting`,
          summary: 'A sample upcoming event.',
          description: 'Placeholder description of the event and what will be discussed.',
          startsAt: inTwoWeeks,
          location: 'Local area',
          registrationInfo: 'Placeholder: explain how people can take part, for example a phone number.',
          status: 'UPCOMING',
          isPublished: true,
          featured: true,
        },
        {
          slug: 'sample-awareness-campaign',
          title: `${TAG} Awareness campaign`,
          summary: 'A sample past event, so you can see how the archive looks.',
          description: 'Placeholder description of a completed awareness campaign.',
          startsAt: lastMonth,
          location: 'Local area',
          status: 'COMPLETED',
          isPublished: true,
        },
      ],
    });
    console.log('  ✔ 2 sample events created (one upcoming, one past)');
  } else {
    console.log('  = Sample events already exist - skipped');
  }

  // ---------- 6. Sample news and notice ----------
  const newsCount = await prisma.newsPost.count({ where: { title: { startsWith: TAG } } });

  if (newsCount === 0) {
    await prisma.newsPost.createMany({
      data: [
        {
          slug: 'sample-news-article',
          title: `${TAG} News article example`,
          type: 'NEWS',
          category: 'Update',
          excerpt: 'A sample news article showing how a story is laid out on the website.',
          content:
            'This is placeholder text. Replace it in Admin Panel → News & Notices.\n\n' +
            '# A small heading\n' +
            'You can add headings to break up a longer article.\n\n' +
            '- You can also add bullet points\n' +
            '- One per line, starting with a dash\n\n' +
            'Use **bold text** to highlight something important.',
          publishedAt: new Date(),
          isPublished: true,
          featured: true,
        },
        {
          slug: 'sample-notice',
          title: `${TAG} Notice example`,
          type: 'NOTICE',
          category: 'Announcement',
          excerpt: 'A sample notice. Notices appear in the member panel too.',
          content:
            'Placeholder notice text. Use notices for announcements that members should see, such as meeting dates or deadlines.',
          publishedAt: new Date(),
          isPublished: true,
        },
      ],
    });
    console.log('  ✔ 2 sample articles created (one news, one notice)');
  } else {
    console.log('  = Sample articles already exist - skipped');
  }

  // ---------- 7. Sample gallery album ----------
  const albumCount = await prisma.galleryAlbum.count({ where: { title: { startsWith: TAG } } });

  if (albumCount === 0) {
    await prisma.galleryAlbum.create({
      data: {
        slug: 'sample-album',
        title: `${TAG} Photo album example`,
        description:
          'A sample album. Add your own photographs from Admin Panel → Gallery. No photos are included, because you should only publish pictures you own.',
        category: 'General',
        isPublished: true,
        sortOrder: 1,
      },
    });
    console.log('  ✔ 1 sample gallery album created (without photos)');
  } else {
    console.log('  = Sample album already exists - skipped');
  }

  // ---------- 8. Sample donor ----------
  const donorCount = await prisma.donor.count({ where: { name: { startsWith: TAG } } });

  if (donorCount === 0) {
    await prisma.donor.create({
      data: {
        name: `${TAG} Example supporter`,
        organization: `${TAG} Example organization`,
        description:
          'A sample supporter entry. Add your real supporters from Admin Panel → Donors, and only switch on "Show publicly" when they have agreed.',
        supportArea: 'General support',
        // Kept private by default, exactly like a real donor entry.
        isPublic: false,
        isActive: true,
        sortOrder: 1,
      },
    });
    console.log('  ✔ 1 sample donor created (private, not shown publicly)');
  } else {
    console.log('  = Sample donor already exists - skipped');
  }
}

// ========================================
// RUN
// ========================================
if (!isDatabaseReady()) {
  stop(
    'DATABASE_URL is not set in your .env file.\n' +
      '    Run  npm run db:use:sqlite  for a quick local database first.',
  );
}

try {
  if (shouldClean) {
    await clean();
  } else {
    await seedDemo();

    console.log(`
  ============================================================
  Sample content added.

  Every headline starts with "${TAG}" so it is obvious what is
  sample data and what is real.

  REMOVE IT AGAIN BEFORE YOUR WEBSITE GOES LIVE:

        npm run db:seed:demo -- --clean

  ============================================================
`);
  }
} catch (error) {
  console.error('\n  The demo seed script failed.');
  console.error(error instanceof Error ? error.message : error);
  console.error('\n  Have you created the tables yet? Run:  npm run db:push\n');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
