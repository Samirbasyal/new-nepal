// ========================================
// PUBLIC WEBSITE - DATABASE QUERIES
// ========================================
// Every question the public website asks the database is written here.
// Keeping queries in one file means the pages stay short and readable.
//
// TWO IMPORTANT RULES BUILT INTO EVERY QUERY:
//   1. Only PUBLISHED rows are ever returned to the public website
//      (isPublished = true). Draft content stays invisible.
//   2. If the database is not set up yet, the page receives an empty list
//      instead of an error, so the website still renders nicely.
// ========================================

import { prisma, safeQuery, isDatabaseConfigured } from '@/lib/prisma';
import { PAGE_SIZE } from '@/lib/constants';

// ========================================
// PROGRAMS SECTION
// ========================================
export async function getPrograms(options: {
  page?: number;
  pageSize?: number;
  category?: string;
  featuredOnly?: boolean;
} = {}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? PAGE_SIZE;

  return safeQuery(
    async () => {
      const where = {
        isPublished: true,
        ...(options.category ? { category: options.category } : {}),
        ...(options.featuredOnly ? { featured: true } : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.program.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { project: { select: { id: true, title: true, kind: true, slug: true } } },
        }),
        prisma.program.count({ where }),
      ]);

      return { rows, total, page, pageSize };
    },
    { rows: [], total: 0, page, pageSize },
  );
}

export async function getProgramBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.program.findFirst({
        where: { slug, isPublished: true },
        include: { project: true },
      }),
    null,
  );
}

export async function getProgramCategories(): Promise<string[]> {
  return safeQuery(async () => {
    const rows = await prisma.program.findMany({
      where: { isPublished: true, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((row) => row.category as string).filter(Boolean);
  }, []);
}

// ========================================
// PROJECTS / OUR WORKS
// "kind" = 'PROJECT' shows on /projects
// "kind" = 'WORK'    shows on /our-works
// ========================================
export async function getProjects(options: {
  kind?: 'PROJECT' | 'WORK';
  page?: number;
  pageSize?: number;
  featuredOnly?: boolean;
  status?: string;
} = {}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? PAGE_SIZE;

  return safeQuery(
    async () => {
      const where = {
        isPublished: true,
        ...(options.kind ? { kind: options.kind } : {}),
        ...(options.featuredOnly ? { featured: true } : {}),
        ...(options.status ? { status: options.status } : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.project.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { _count: { select: { programs: true, galleryImages: true } } },
        }),
        prisma.project.count({ where }),
      ]);

      return { rows, total, page, pageSize };
    },
    { rows: [], total: 0, page, pageSize },
  );
}

export async function getProjectBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.project.findFirst({
        where: { slug, isPublished: true },
        include: {
          programs: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
          galleryImages: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
        },
      }),
    null,
  );
}

// ========================================
// EVENTS SECTION
// ========================================
export async function getEvents(options: {
  /** Only events that have not happened yet (sorted soonest first). */
  upcomingOnly?: boolean;
  /** Only events that have already happened (sorted newest first). */
  pastOnly?: boolean;
  page?: number;
  pageSize?: number;
  featuredOnly?: boolean;
} = {}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const now = new Date();

  return safeQuery(
    async () => {
      const where = {
        isPublished: true,
        ...(options.featuredOnly ? { featured: true } : {}),
        ...(options.upcomingOnly ? { startsAt: { gte: now } } : {}),
        ...(options.pastOnly ? { startsAt: { lt: now } } : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.event.findMany({
          where,
          orderBy: options.upcomingOnly ? { startsAt: 'asc' } : { startsAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.event.count({ where }),
      ]);

      return { rows, total, page, pageSize };
    },
    { rows: [], total: 0, page, pageSize },
  );
}

export async function getEventBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.event.findFirst({
        where: { slug, isPublished: true },
        include: { galleryImages: { where: { isPublished: true } } },
      }),
    null,
  );
}

// ========================================
// NEWS / NOTICES
// ========================================
export async function getNewsPosts(options: {
  type?: string;
  page?: number;
  pageSize?: number;
  featuredOnly?: boolean;
} = {}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? PAGE_SIZE;

  return safeQuery(
    async () => {
      const where = {
        isPublished: true,
        ...(options.type ? { type: options.type } : {}),
        ...(options.featuredOnly ? { featured: true } : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.newsPost.findMany({
          where,
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.newsPost.count({ where }),
      ]);

      return { rows, total, page, pageSize };
    },
    { rows: [], total: 0, page, pageSize },
  );
}

export async function getNewsBySlug(slug: string) {
  return safeQuery(
    () => prisma.newsPost.findFirst({ where: { slug, isPublished: true } }),
    null,
  );
}

// ========================================
// GALLERY SECTION
// ========================================
export async function getGalleryAlbums(limit?: number) {
  return safeQuery(
    () =>
      prisma.galleryAlbum.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        ...(limit ? { take: limit } : {}),
        include: {
          images: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' }, take: 4 },
          _count: { select: { images: true } },
        },
      }),
    [],
  );
}

export async function getGalleryImages(options: { limit?: number; albumId?: string } = {}) {
  return safeQuery(
    () =>
      prisma.galleryImage.findMany({
        where: {
          isPublished: true,
          ...(options.albumId ? { albumId: options.albumId } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        ...(options.limit ? { take: options.limit } : {}),
        include: { album: { select: { id: true, title: true, slug: true } } },
      }),
    [],
  );
}

// ========================================
// MEMBERS / LEADERSHIP SECTION (public view)
// ========================================
// Only members that an administrator marked as "public" are returned,
// and only non-sensitive columns are selected.
// The password hash and login information are NEVER selected here.
// ========================================
export async function getPublicMembers() {
  return safeQuery(
    () =>
      prisma.memberProfile.findMany({
        where: { isPublic: true, user: { isActive: true } },
        orderBy: [{ designation: 'asc' }, { createdAt: 'asc' }],
        // Only these columns are selected. Password hashes, e-mail addresses,
        // phone numbers and membership numbers are deliberately NOT selected,
        // so they cannot accidentally appear on the public website.
        select: {
          id: true,
          designation: true,
          department: true,
          bio: true,
          photoUrl: true,
          joinedAt: true,
          user: { select: { name: true } },
        },
      }),
    [],
  );
}

// ========================================
// DONOR SECTION (public view)
// ========================================
export async function getPublicDonors() {
  return safeQuery(
    () =>
      prisma.donor.findMany({
        where: { isPublic: true, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    [],
  );
}

// ========================================
// BENEFICIARIES SECTION
// ========================================
export async function getBeneficiaryCategories() {
  return safeQuery(
    () =>
      prisma.beneficiaryCategory.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    [],
  );
}

// ========================================
// CONTENT SECTIONS (LONG EDITABLE TEXT)
// ========================================
export async function getContentByGroup(group: string) {
  return safeQuery(
    () =>
      prisma.contentSection.findMany({
        where: { group, isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    [],
  );
}

export async function getContentBySlug(slug: string) {
  return safeQuery(
    () => prisma.contentSection.findFirst({ where: { slug, isPublished: true } }),
    null,
  );
}

// ========================================
// HOMEPAGE HELPERS
// ========================================
/** Load everything the homepage needs, all at the same time. */
export async function getHomepageData() {
  const [programs, projects, works, events, news, albums, photos, beneficiaries] =
    await Promise.all([
      getPrograms({ pageSize: 3, featuredOnly: true }),
      getProjects({ kind: 'PROJECT', pageSize: 3, featuredOnly: true }),
      getProjects({ kind: 'WORK', pageSize: 3 }),
      getEvents({ upcomingOnly: true, pageSize: 3 }),
      getNewsPosts({ pageSize: 3 }),
      getGalleryAlbums(3),
      getGalleryImages({ limit: 8 }),
      getBeneficiaryCategories(),
    ]);

  return { programs, projects, works, events, news, albums, photos, beneficiaries };
}

// ========================================
// ABOUT PAGE STATISTICS (counts straight from the database)
// ========================================
// These are real counts of what is published on this website - not invented
// impact claims. They are safe to display because they describe the website
// content itself. The organization's own impact numbers live in
// Admin Panel -> Settings -> Impact numbers.
export async function getPublishedCounts() {
  const empty = { programs: 0, projects: 0, works: 0, events: 0, news: 0, photos: 0 };
  if (!isDatabaseConfigured()) return empty;

  return safeQuery(async () => {
    const [programs, projects, works, events, news, photos] = await Promise.all([
      prisma.program.count({ where: { isPublished: true } }),
      prisma.project.count({ where: { isPublished: true, kind: 'PROJECT' } }),
      prisma.project.count({ where: { isPublished: true, kind: 'WORK' } }),
      prisma.event.count({ where: { isPublished: true } }),
      prisma.newsPost.count({ where: { isPublished: true } }),
      prisma.galleryImage.count({ where: { isPublished: true } }),
    ]);
    return { programs, projects, works, events, news, photos };
  }, empty);
}
