// ========================================
// KARYA SAMITI - DATABASE QUERIES
// ========================================
// The ONE place that reads committee members out of the database.
//
// WHY THIS FILE EXISTS AT ALL
//   The public page and the Admin Panel need the SAME table but DIFFERENT
//   columns. Writing the query once, here, means the private columns are
//   mentioned in exactly one place - and that place never sends them to a
//   public page.
//
// HOW THE PRIVACY IS ACTUALLY ENFORCED
//   getPublicCommittee() uses Prisma's "select" with the FOUR public columns
//   only. The private columns (phone, email, permanent address, date of birth,
//   citizenship, member number, internal notes) are not loaded from the
//   database at all, so they cannot appear in the HTML, in a JSON answer, in a
//   search result or in a page source. It is not "hidden in the template" - the
//   data never leaves the database row.
//
//   The Admin Panel uses the separate query below, which is only ever called
//   after requireAdmin()/requireAdminApi().
// ========================================

import { isDatabaseConfigured, prisma } from '@/lib/prisma';

// ========================================
// WHAT THE PUBLIC MAY SEE - AND NOTHING ELSE
// ========================================
// If somebody ever adds a private column to this list by mistake, the public
// page would show it. That is why the list is a named constant with a loud
// comment, and why the Admin Panel does not use it.
const PUBLIC_FIELDS = {
  id: true,
  fullName: true, // public: name
  postTitle: true, // public: post
  currentAddress: true, // public: current address
  photoUrl: true, // public: photo
  displayOrder: true, // needed for ordering (a number, harmless)
} as const;

export type PublicCommitteeMember = {
  id: string;
  fullName: string;
  postTitle: string;
  currentAddress: string | null;
  photoUrl: string | null;
  displayOrder: number;
};

/**
 * CURRENT committee members, in the order the office arranged them.
 * Former members are excluded unless the organization switched them on in
 * Settings -> Karya Samiti.
 */
export async function getPublicCommittee(includeFormer = false): Promise<PublicCommitteeMember[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.karyaSamitiMember.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        ...(includeFormer ? {} : { status: 'CURRENT' }),
      },
      select: PUBLIC_FIELDS,
      orderBy: [{ displayOrder: 'asc' }, { fullName: 'asc' }],
    });
  } catch (error) {
    console.error('[karya] could not read the committee:', error);
    return [];
  }
}

/** Former committee members only (used when the office switches them on). */
export async function getFormerCommittee(): Promise<PublicCommitteeMember[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.karyaSamitiMember.findMany({
      where: { isDeleted: false, isActive: true, status: 'FORMER' },
      select: PUBLIC_FIELDS,
      orderBy: [{ displayOrder: 'asc' }, { fullName: 'asc' }],
    });
  } catch {
    return [];
  }
}

/** How many current committee members exist (used by the dashboard). */
export async function countCommittee(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  try {
    return await prisma.karyaSamitiMember.count({
      where: { isDeleted: false, isActive: true, status: 'CURRENT' },
    });
  } catch {
    return 0;
  }
}

// ========================================
// ACTIVE POSTS (for the Admin Panel drop-down)
// ========================================
export async function getKaryaPosts() {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.karyaSamitiPost.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  } catch {
    return [];
  }
}

// ========================================
// CREATE THE STARTING POSTS
// ========================================
// Called by "npm run db:seed" and by the posts screen when the list is empty.
// It only ever ADDS missing positions - it never renames or deletes one the
// organization has already changed.
export async function ensureDefaultKaryaPosts(
  posts: { name: string; nameEn?: string; sortOrder: number }[],
): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  let created = 0;

  for (const post of posts) {
    const existing = await prisma.karyaSamitiPost.findUnique({ where: { name: post.name } });
    if (existing) continue;

    await prisma.karyaSamitiPost.create({
      data: {
        name: post.name,
        nameEn: post.nameEn ?? null,
        sortOrder: post.sortOrder,
        isActive: true,
      },
    });

    created += 1;
  }

  return created;
}
