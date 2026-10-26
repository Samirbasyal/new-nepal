// ========================================
// ADMIN PANEL - SECTION REGISTRY
// ========================================
// This file is the "map" of the Admin Panel.
//
// Every section the administrator can manage is described here in ONE short
// block: which database table it uses, which fields the search box looks at,
// how rows are sorted, and which validation rules apply.
//
// ADDING A NEW SECTION? Copy an existing block, change the names, and add the
// matching page under app/admin/. Nothing else needs to change, because the
// generic engine in lib/api/crud.ts does the heavy lifting.
//
// The "key" below is also the address:
//    key: 'programs'  ->  /api/admin/programs
// ========================================

import { prisma } from '@/lib/prisma';
import { writeActivity } from '@/lib/audit';
import { prismaModel, UserFacingError, type ResourceConfig, type ListParams } from '@/lib/api/crud';
import { hashPassword } from '@/lib/auth/password';
import { buildSearchWhere, isSqlite } from '@/lib/api/crud';
import {
  beneficiarySchema,
  contentSectionSchema,
  // NOTE: donationSchema is imported further down from lib/donation/schemas.ts,
  // which is the richer version (donor phone, type, purpose, status, remarks).
  donorSchema,
  eventSchema,
  galleryAlbumSchema,
  galleryImageSchema,
  memberCreateSchema,
  memberUpdateSchema,
  newsSchema,
  programSchema,
  projectSchema,
  statusUpdateSchema,
  taskSchema,
} from '@/lib/validation/schemas';
// FUND MANAGEMENT validation rules (see lib/fund/schemas.ts)
import {
  bankSchema,
  fundCategorySchema,
  expenseCategorySchema,
  adminPaymentSchema,
  expenseSchema,
} from '@/lib/fund/schemas';
// FUND MANAGEMENT money rules (approval, soft delete, audit trail)
import { removePayment, removeExpense } from '@/lib/fund/service';
// MEMBER INVITES: when an administrator creates a member we send a REAL
// verification email from here (see lib/auth/verification.ts).
import { sendVerificationEmail } from '@/lib/auth/verification';
import type { MailResult } from '@/lib/email/mailer';
import { notifyAdmins } from '@/lib/notifications';
// KARYA SAMITI (à¤•à¤¾à¤°à¥à¤¯ à¤¸à¤®à¤¿à¤¤à¤¿) validation rules (see lib/karya/schemas.ts)
import { committeeDutySchema, karyaMemberSchema, karyaMemberUpdateSchema, karyaPostSchema, roleDutySchema } from '@/lib/karya/schemas';
// LOAN MANAGEMENT: the rules (lib/loan/schemas.ts), the arithmetic
// (lib/loan/calc.ts) and the actions (lib/loan/service.ts).
import { loanSchema, loanUpdateSchema } from '@/lib/loan/schemas';
// DISTRICT WORK (77 districts) rules - see lib/district/schemas.ts
import { districtActivitySchema, districtActivityUpdateSchema } from '@/lib/district/schemas';
// DONATION MANAGEMENT rules - see lib/donation/schemas.ts (donor phone, type,
// purpose, status and remarks all live there).
import { donationSchema, donationUpdateSchema } from '@/lib/donation/schemas';
import { deriveLoanStatus, loanFigures } from '@/lib/loan/calc';
import { createLoan, deleteLoan, updateLoan } from '@/lib/loan/service';

// ========================================
// MEMBERS - SHARED HELPERS
// ========================================
// A member's information is split over two tables:
//   users            -> name, email, phone, role, isActive, password hash
//   member_profiles  -> designation, department, membership number, status...
//
// The Admin Panel should not care about that split, so we flatten the two
// tables into ONE flat row.

type MemberRowShape = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  // ---------- Email verification (added with the member invite system) ----------
  emailVerifiedAt: Date | null;
  membershipNo: string | null;
  designation: string | null;
  workingArea: string | null;
  department: string | null;
  bio: string | null;
  photoUrl: string | null;
  address: string | null;
  district: string | null;
  municipality: string | null;
  ward: string | null;
  status: string;
  joinedAt: Date | null;
  isPublic: boolean;
};

/** Combine a user row + its profile row into one flat object. */
function flattenMember(user: Record<string, unknown>): MemberRowShape {
  const profile = (user.profile ?? {}) as Record<string, unknown>;
  return {
    id: String(user.id),
    name: String(user.name ?? ''),
    email: String(user.email ?? ''),
    phone: (user.phone as string) ?? null,
    role: String(user.role ?? 'MEMBER'),
    isActive: Boolean(user.isActive),
    lastLoginAt: (user.lastLoginAt as Date) ?? null,
    createdAt: user.createdAt as Date,
    emailVerifiedAt: (user.emailVerifiedAt as Date) ?? null,
    membershipNo: (profile.membershipNo as string) ?? null,
    designation: (profile.designation as string) ?? null,
    workingArea: (profile.workingArea as string) ?? null,
    department: (profile.department as string) ?? null,
    bio: (profile.bio as string) ?? null,
    photoUrl: (profile.photoUrl as string) ?? null,
    address: (profile.address as string) ?? null,
    district: (profile.district as string) ?? null,
    municipality: (profile.municipality as string) ?? null,
    ward: (profile.ward as string) ?? null,
    status: String(profile.status ?? 'PENDING'),
    joinedAt: (profile.joinedAt as Date) ?? null,
    isPublic: Boolean(profile.isPublic),
  };
}

// ========================================
// A STARTING PASSWORD THE OFFICE CAN HAND OVER
// ========================================
// An administrator may leave the password box empty. In that case we make one
// here, show it once on screen, and the member is told to change it after the
// first sign-in. Three short words plus two digits: easy to read out over the
// phone, still about 40 bits of randomness, and it is only ever a starting
// point - the member replaces it.
const PASSWORD_WORDS = [
  'Himal', 'Koshi', 'Gandaki', 'Bagmati', 'Lumbini', 'Karnali', 'Sudur',
  'Surya', 'Chandra', 'Tara', 'Phool', 'Ghat', 'Khet', 'Bagaicha', 'Pahad',
  'Rato', 'Hariyo', 'Nil', 'Seto', 'Sano', 'Thulo', 'Naya', 'Purano',
];

function generateStartingPassword(): string {
  const pick = () => PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)];
  const digits = String(Math.floor(10 + Math.random() * 90)); // always two digits
  return `${pick()}-${pick()}${digits}`;
}

/** Split the flat form values back into "user columns" and "profile columns". */
function splitMemberData(data: Record<string, unknown>) {
  const {
    // columns that belong to the "users" table
    name, email, phone, role, isActive, password,
    // everything else belongs to the "member_profiles" table
    membershipNo, designation, workingArea, department, bio, photoUrl, address,
    district, municipality, ward,
    status, joinedAt, isPublic,
  } = data;

  return {
    userFields: { name, email, phone, role, isActive, password },
    profileFields: {
      membershipNo, designation, workingArea, department, bio, photoUrl, address,
      // The three address columns used by the district reports.
      district, municipality, ward,
      status, joinedAt, isPublic,
    },
  };
}

// ========================================
// THE REGISTRY
// ========================================
export const RESOURCES: Record<string, ResourceConfig> = {
  // ========================================
  // MEMBERS SECTION (Admin Panel -> Members)
  // This section manages login accounts (both members and administrators).
  // ========================================
  members: {
    key: 'members',
    label: 'Members',
    entity: 'Member',
    delegate: prismaModel('user'),
    createSchema: memberCreateSchema,
    // .partial() means "every field is optional when editing", so small
    // changes (for example switching a member on or off) can be saved without
    // sending the whole form again.
    updateSchema: memberUpdateSchema.partial(),
    searchFields: [], // handled by the custom list below
    statusField: null,
    orderBy: { createdAt: 'desc' },
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true,

    // --- Custom listing: searches across BOTH tables ---
    custom: {
      async list(params: ListParams) {
        const and: Record<string, unknown>[] = [];

        // Search across BOTH tables: the name, email and phone live on the user
        // row, while the district and membership number live on the profile row.
        const term = (params.search ?? '').trim();

        const userSearch = buildSearchWhere(['name', 'email', 'phone'], term);
        const profileSearch = buildSearchWhere(['district', 'municipality', 'membershipNo', 'designation'], term);

        if (userSearch || profileSearch) {
          and.push({
            OR: [
              ...(userSearch ? [userSearch] : []),
              ...(profileSearch ? [{ profile: { is: profileSearch } }] : []),
            ],
          });
        }

        if (params.status) {
          and.push({ profile: { is: { status: params.status } } });
        }
        // Filter by district (used by the contribution and district reports).
        if (params.filterField === 'district' && params.filterValue) {
          and.push({ profile: { is: { district: params.filterValue } } });
        }
        if (params.filterField === 'role' && params.filterValue) {
          and.push({ role: params.filterValue });
        }

        const where = and.length ? { AND: and } : {};

        const [total, users] = await Promise.all([
          prisma.user.count({ where }),
          prisma.user.findMany({
            where,
            include: { profile: true },
            orderBy: { createdAt: 'desc' },
            skip: (params.page - 1) * params.pageSize,
            take: params.pageSize,
          }),
        ]);

        return { rows: users.map((u) => flattenMember(u as unknown as Record<string, unknown>)), total };
      },

      // --- Custom create: hashes the password, fills both tables, invites ---
      // This is the ONLY way a member account is created (public registration is
      // switched off - see app/api/auth/register/route.ts).
      async create(data, currentUser) {
        const { userFields, profileFields } = splitMemberData(data);

        // ---------- The starting password ----------
        // The office may type one, or leave the box empty and let us make one.
        const typed = typeof userFields.password === 'string' ? userFields.password.trim() : '';
        const generatedPassword = typed === '' ? generateStartingPassword() : null;
        const password = typed || generatedPassword || '';

        if (password.length < 8) {
          throw new UserFacingError('Please set a password of at least 8 characters.');
        }

        const created = await prisma.user.create({
          data: {
            name: String(userFields.name),
            email: String(userFields.email),
            phone: (userFields.phone as string) ?? null,
            role: String(userFields.role ?? 'MEMBER'),
            isActive: Boolean(userFields.isActive ?? true),
            // The password is hashed here - the real password is never stored.
            passwordHash: await hashPassword(password),
            // Which administrator opened this account (audit trail).
            invitedById: currentUser.id,
            profile: {
              create: {
                membershipNo: (profileFields.membershipNo as string) ?? null,
                designation: (profileFields.designation as string) ?? null,
                workingArea: (profileFields.workingArea as string) ?? null,
                department: (profileFields.department as string) ?? null,
                bio: (profileFields.bio as string) ?? null,
                photoUrl: (profileFields.photoUrl as string) ?? null,
                address: (profileFields.address as string) ?? null,
                district: (profileFields.district as string) ?? null,
                municipality: (profileFields.municipality as string) ?? null,
                ward: (profileFields.ward as string) ?? null,
                status: String(profileFields.status ?? 'PENDING'),
                joinedAt: (profileFields.joinedAt as Date) ?? null,
                isPublic: Boolean(profileFields.isPublic ?? false),
              },
            },
          },
          include: { profile: true },
        });

        // ---------- The verification email ----------
        // Only members go through the verification step; an administrator
        // created from this form can sign in straight away.
        const role = String(userFields.role ?? 'MEMBER');
        const wantsEmail = data.sendVerificationEmail === undefined
          ? true
          : Boolean(data.sendVerificationEmail);

        let mail: MailResult | null = null;

        if (role === 'MEMBER' && wantsEmail) {
          mail = await sendVerificationEmail(
            { id: created.id, name: created.name, email: created.email },
            { requestedById: currentUser.id },
          );
        }

        // ---------- Tell the other administrators ----------
        // (not the one who just created the account - they already know)
        await notifyAdmins({
          title: 'New member added',
          message: `${created.name} (${created.email}) was added to the member list by ${currentUser.name}.`,
          type: 'INFO',
          link: '/admin/members',
          exceptUserId: currentUser.id,
        });

        return {
          ...flattenMember(created as unknown as Record<string, unknown>),
          // ---------- Values the Admin Panel shows ONCE ----------
          // The generated password is never stored anywhere in readable form, so
          // this is the single moment it can be handed over.
          generatedPassword,
          verificationEmailSent: mail ? mail.ok : false,
          verificationEmailNote: mail && !mail.ok ? mail.error ?? null : null,
        };
      },

      // --- Custom update: password only changes when a new one is typed ---
      // The update is written field by field, so sending only ONE value (for
      // example switching "Active" off) never overwrites the other columns.
      async update(id, data, currentUser) {
        const { userFields, profileFields } = splitMemberData(data);

        // Safety rule 1: an administrator cannot remove their own admin rights.
        if (id === currentUser.id && userFields.role !== undefined && userFields.role !== 'ADMIN') {
          throw new UserFacingError('You cannot change your own role. Ask another administrator.');
        }
        // Safety rule 2: an administrator cannot deactivate their own account.
        if (id === currentUser.id && userFields.isActive === false) {
          throw new UserFacingError('You cannot deactivate your own account.');
        }
        // Safety rule 3: never remove the last administrator.
        if (id !== currentUser.id && userFields.role !== undefined && userFields.role !== 'ADMIN') {
          const target = await prisma.user.findUnique({
            where: { id },
            select: { role: true },
          });
          if (target?.role === 'ADMIN') {
            const remaining = await prisma.user.count({ where: { role: 'ADMIN' } });
            if (remaining <= 1) {
              throw new UserFacingError(
                'This is the only administrator account, so its role cannot be changed.',
              );
            }
          }
        }

        // ---------- Columns that belong to the "users" table ----------
        const userData: Record<string, unknown> = {};
        if (userFields.name !== undefined) userData.name = String(userFields.name);
        if (userFields.email !== undefined) userData.email = String(userFields.email);
        if (userFields.phone !== undefined) userData.phone = userFields.phone ?? null;
        if (userFields.role !== undefined) userData.role = String(userFields.role);
        if (userFields.isActive !== undefined) userData.isActive = Boolean(userFields.isActive);

        // Only replace the stored hash when a new password was typed in.
        const newPassword = userFields.password;
        if (newPassword !== undefined && newPassword !== null && String(newPassword).trim() !== '') {
          if (String(newPassword).length < 8) {
            throw new UserFacingError('The new password must be at least 8 characters.');
          }
          userData.passwordHash = await hashPassword(String(newPassword));
        }

        // ---------- Columns that belong to the "member_profiles" table ----------
        const profileData: Record<string, unknown> = {};
        if (profileFields.membershipNo !== undefined)
          profileData.membershipNo = profileFields.membershipNo ?? null;
        if (profileFields.designation !== undefined)
          profileData.designation = profileFields.designation ?? null;
        // The area this member looks after. Written from the Member management
        // table and from the Members form, and read by the member's own profile.
        if (profileFields.workingArea !== undefined)
          profileData.workingArea = profileFields.workingArea ?? null;
        if (profileFields.department !== undefined)
          profileData.department = profileFields.department ?? null;
        if (profileFields.bio !== undefined) profileData.bio = profileFields.bio ?? null;
        if (profileFields.photoUrl !== undefined) profileData.photoUrl = profileFields.photoUrl ?? null;
        if (profileFields.address !== undefined) profileData.address = profileFields.address ?? null;
        if (profileFields.district !== undefined) profileData.district = profileFields.district ?? null;
        if (profileFields.municipality !== undefined)
          profileData.municipality = profileFields.municipality ?? null;
        if (profileFields.ward !== undefined) profileData.ward = profileFields.ward ?? null;
        if (profileFields.status !== undefined) profileData.status = String(profileFields.status);
        if (profileFields.joinedAt !== undefined) profileData.joinedAt = profileFields.joinedAt ?? null;
        if (profileFields.isPublic !== undefined) profileData.isPublic = Boolean(profileFields.isPublic);

        const updated = await prisma.user.update({
          where: { id },
          data: {
            ...userData,
            // upsert = create the profile row if this user does not have one yet
            profile: {
              upsert: {
                create: { status: 'PENDING', isPublic: false, ...profileData },
                update: profileData,
              },
            },
          },
          include: { profile: true },
        });

        return flattenMember(updated as unknown as Record<string, unknown>);
      },

      // --- Custom delete: protects you from locking yourself out ---
      async remove(id, currentUser) {
        if (id === currentUser.id) {
          throw new UserFacingError('You cannot delete your own account.');
        }

        const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (!target) throw new UserFacingError('This member no longer exists.', 404);

        // Never allow deleting the last administrator - otherwise nobody
        // could open the Admin Panel again.
        if (target.role === 'ADMIN') {
          const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            throw new UserFacingError(
              'This is the only administrator account. Create another administrator first.',
            );
          }
        }

        await prisma.user.delete({ where: { id } });
      },
    },
  },

  // ========================================
  // PROGRAMS SECTION
  // ========================================
  programs: {
    key: 'programs',
    label: 'Programs',
    entity: 'Program',
    delegate: prismaModel('program'),
    createSchema: programSchema,
    updateSchema: programSchema.partial(),
    searchFields: ['title', 'category', 'location', 'summary'],
    statusField: 'status',
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    slugFrom: 'title',
    include: { project: { select: { id: true, title: true, kind: true } } },
  },

  // ========================================
  // PROJECTS / OUR WORKS SECTION
  // One section controls both pages (/projects and /our-works).
  // The "kind" field decides which page an entry appears on.
  // ========================================
  projects: {
    key: 'projects',
    label: 'Projects & Our Works',
    entity: 'Project',
    delegate: prismaModel('project'),
    createSchema: projectSchema,
    updateSchema: projectSchema.partial(),
    searchFields: ['title', 'category', 'location', 'summary'],
    statusField: 'status',
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    slugFrom: 'title',
  },

  // ========================================
  // EVENTS SECTION
  // ========================================
  events: {
    key: 'events',
    label: 'Events',
    entity: 'Event',
    delegate: prismaModel('event'),
    createSchema: eventSchema,
    updateSchema: eventSchema.partial(),
    searchFields: ['title', 'location', 'summary'],
    statusField: 'status',
    orderBy: { startsAt: 'desc' },
    slugFrom: 'title',
  },

  // ========================================
  // NEWS / NOTICES
  // ========================================
  news: {
    key: 'news',
    label: 'News & Notices',
    entity: 'News post',
    delegate: prismaModel('newsPost'),
    createSchema: newsSchema,
    updateSchema: newsSchema.partial(),
    searchFields: ['title', 'category', 'excerpt'],
    statusField: 'type', // the filter here switches between News / Notice / Press / Story
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    slugFrom: 'title',
  },

  // ========================================
  // GALLERY SECTION - ALBUMS
  // ========================================
  'gallery-albums': {
    key: 'gallery-albums',
    label: 'Gallery albums',
    entity: 'Gallery album',
    delegate: prismaModel('galleryAlbum'),
    createSchema: galleryAlbumSchema,
    updateSchema: galleryAlbumSchema.partial(),
    searchFields: ['title', 'category', 'description'],
    statusField: null,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    slugFrom: 'title',
    include: { _count: { select: { images: true } } },
  },

  // ========================================
  // GALLERY SECTION - PHOTOS
  // ========================================
  'gallery-images': {
    key: 'gallery-images',
    label: 'Gallery photos',
    entity: 'Gallery photo',
    delegate: prismaModel('galleryImage'),
    createSchema: galleryImageSchema,
    updateSchema: galleryImageSchema.partial(),
    searchFields: ['title', 'category'],
    statusField: null,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      album: { select: { id: true, title: true } },
    },
  },

  // ========================================
  // DONOR SECTION
  // ========================================
  donors: {
    key: 'donors',
    label: 'Donors & supporters',
    entity: 'Donor',
    delegate: prismaModel('donor'),
    createSchema: donorSchema,
    updateSchema: donorSchema.partial(),
    searchFields: ['name', 'organization', 'supportArea', 'description'],
    statusField: null,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  },

  // ========================================
  // BENEFICIARIES SECTION
  // ========================================
  beneficiaries: {
    key: 'beneficiaries',
    label: 'Beneficiaries',
    entity: 'Beneficiary category',
    delegate: prismaModel('beneficiaryCategory'),
    createSchema: beneficiarySchema,
    updateSchema: beneficiarySchema.partial(),
    searchFields: ['name', 'description'],
    statusField: null,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    slugFrom: 'name',
  },

  // ========================================
  // WOMEN EMPOWERED + ABOUT PAGE CONTENT
  // Long text blocks (Vision, Mission, Objectives, "Who we are", ...).
  // ========================================
  'content-sections': {
    key: 'content-sections',
    label: 'Content sections',
    entity: 'Content section',
    delegate: prismaModel('contentSection'),
    createSchema: contentSectionSchema,
    updateSchema: contentSectionSchema.partial(),
    searchFields: ['title', 'subtitle', 'body'],
    statusField: 'group', // filter by page (About / Home / Women / ...)
    orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
    slugFrom: 'title',
  },

  // ========================================
  // DONATIONS (PRIVATE RECORD BOOK)
  // ========================================
  donations: {
    key: 'donations',
    label: 'Donations received',
    entity: 'Donation',

    delegate: prismaModel('donation'),

    // The richer rules live in lib/donation/schemas.ts (donor phone, donation
    // type, purpose, status, remarks). They were written for the donation
    // screens; this is where they are wired in.
    createSchema: donationSchema,
    updateSchema: donationUpdateSchema,

    // The search box understands a donor's name, email or phone, a receipt
    // reference, the purpose and any notes.
    searchFields: ['donorName', 'donorEmail', 'donorPhone', 'reference', 'purpose', 'note', 'remarks'],

    // Filter by the DONATION status (PENDING / VERIFIED / REJECTED).
    // NOTE: an earlier version had 'method' here, which meant the filter
    // buttons filtered by bank transfer / cash, not by whether the money had
    // been checked. That was a mistake and is fixed.
    statusField: 'status',
    orderBy: { receivedOn: 'desc' },
    // NO include here. Donation keeps the administrator's id in verifiedById and
    // has no relation named "verifiedBy", so asking Prisma to include it made the
    // whole list request fail. The name is looked up on the single-record page
    // (app/admin/(panel)/donations/[id]) instead, where it costs one query.

    custom: {
      // A donation is HIDDEN, never destroyed: the totals on the screen have to
      // stay explainable, so the row is kept for the history.
      async remove(id, currentUser) {
        const before = await prisma.donation.findUnique({ where: { id } });

        if (!before || before.isDeleted) {
          throw new UserFacingError('That donation was already removed.');
        }

        await prisma.donation.update({ where: { id }, data: { isDeleted: true } });

        await writeActivity({
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: 'DELETE',
          entity: 'Donation',
          entityId: id,
          detail: `removed ${before.donorName}: ${before.amount} ${before.currency}`,
          oldValue: before.status,
          newValue: null,
        });
      },
    },
  },

  // ========================================
  // TASKS (ADMIN -> MEMBER)
  // ========================================
  tasks: {
    key: 'tasks',
    label: 'Member tasks',
    entity: 'Task',
    delegate: prismaModel('task'),
    createSchema: taskSchema,
    updateSchema: taskSchema.partial(),
    searchFields: ['title', 'description'],
    statusField: 'status',
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  },

  // ========================================
  // COMMITTEE RESPONSIBILITIES (KARYA SAMITI)
  // ========================================
  // An administrator gives a duty to one committee member. It appears in that
  // person's panel under "Your Role & Responsibilities".
  //
  // The duties are deliberately NOT tied to a post: the office writes them, so
  // the Treasurer's duties can change every year without touching code.
  duties: {
    key: 'duties',
    label: 'Committee responsibilities',
    entity: 'Committee duty',
    delegate: prismaModel('committeeDuty'),
    createSchema: committeeDutySchema,
    updateSchema: committeeDutySchema.partial(),
    searchFields: ['title', 'description', 'instructions'],
    statusField: 'status',
    orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    include: { member: { select: { id: true, fullName: true, postTitle: true } } },
  },

  // ========================================
  // JOIN COMMUNITY APPLICATIONS
  // These come from the public form, so they can only be reviewed and deleted
  // here - not created by hand.
  // ========================================
  applications: {
    key: 'applications',
    label: 'Join applications',
    entity: 'Join application',
    delegate: prismaModel('joinApplication'),
    updateSchema: statusUpdateSchema,
    searchFields: ['fullName', 'phone', 'email', 'areaOfInterest', 'message'],
    statusField: 'status',
    orderBy: { createdAt: 'desc' },
    allowCreate: false,
  },

  // ========================================
  // CONTACT MESSAGES
  // Also coming from the public website - review, change status or delete.
  // ========================================
  messages: {
    key: 'messages',
    label: 'Contact messages',
    entity: 'Contact message',
    delegate: prismaModel('contactMessage'),
    updateSchema: statusUpdateSchema,
    searchFields: ['name', 'email', 'subject', 'message'],
    statusField: 'status',
    orderBy: { createdAt: 'desc' },
    allowCreate: false,
  },

  // ========================================
  // ACTIVITY LOG (READ ONLY)
  // ========================================
  activity: {
    key: 'activity',
    label: 'Activity log',
    entity: 'Activity',
    delegate: prismaModel('activityLog'),
    searchFields: ['actorName', 'entity', 'action', 'detail'],
    statusField: null,
    orderBy: { createdAt: 'desc' },
    allowCreate: false,
    allowUpdate: false,
    allowDelete: false,
    include: { actor: { select: { id: true, name: true, email: true } } },
  },

  // ========================================
  // ========================================
  // FUND MANAGEMENT - BANKS & QR CODES
  // ========================================
  // The accounts members pay into. Managed from
  // Admin Panel -> Fund Management -> Banks & QR.
  // Members only ever see banks where isActive = true.
  //
  // A bank that already has payments is never really deleted (see the remove
  // rule below) - it is switched off instead, so old receipts keep pointing at
  // a real record.
  // ========================================
  banks: {
    key: 'banks',
    label: 'Banks & QR',
    entity: 'Bank',
    delegate: prismaModel('bank'),
    createSchema: bankSchema,
    updateSchema: bankSchema.partial(),
    searchFields: ['name', 'accountName', 'accountNumber', 'branch'],
    statusField: 'isActive',
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    custom: {
      async remove(id) {
        const used = await prisma.fundPayment.count({ where: { bankId: id, isDeleted: false } });

        if (used > 0) {
          throw new UserFacingError(
            `This bank has ${used} payment(s) linked to it, so it cannot be deleted. ` +
              'Switch it off instead - members will stop seeing it, and the old payments stay intact.',
          );
        }

        await prisma.bank.delete({ where: { id } });
      },
    },
  },

  // ========================================
  // FUND MANAGEMENT - FUND CATEGORIES
  // ========================================
  // Monthly Member Fund, Donation, Event Fund, Emergency Fund...
  // ========================================
  'fund-categories': {
    key: 'fund-categories',
    label: 'Fund categories',
    entity: 'Fund category',
    delegate: prismaModel('fundCategory'),
    createSchema: fundCategorySchema,
    updateSchema: fundCategorySchema.partial(),
    searchFields: ['name', 'description'],
    statusField: 'isActive',
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    slugFrom: 'name',
    custom: {
      async remove(id) {
        const used = await prisma.fundPayment.count({
          where: { fundCategoryId: id, isDeleted: false },
        });

        if (used > 0) {
          throw new UserFacingError(
            `This category is used by ${used} payment(s). Switch it off instead of deleting it.`,
          );
        }

        await prisma.fundCategory.delete({ where: { id } });
      },
    },
  },

  // ========================================
  // FUND MANAGEMENT - EXPENSE CATEGORIES
  // ========================================
  // Event, Office, Equipment, Transportation, Food, Salary, Maintenance,
  // Charity, Emergency, Other.
  // ========================================
  'expense-categories': {
    key: 'expense-categories',
    label: 'Expense categories',
    entity: 'Expense category',
    delegate: prismaModel('expenseCategory'),
    createSchema: expenseCategorySchema,
    updateSchema: expenseCategorySchema.partial(),
    searchFields: ['name', 'description'],
    statusField: 'isActive',
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    slugFrom: 'name',
    custom: {
      async remove(id) {
        const used = await prisma.expense.count({ where: { categoryId: id, isDeleted: false } });

        if (used > 0) {
          throw new UserFacingError(
            `This category is used by ${used} expense(s). Switch it off instead of deleting it.`,
          );
        }

        await prisma.expenseCategory.delete({ where: { id } });
      },
    },
  },

  // ========================================
  // FUND MANAGEMENT - COLLECTIONS (member payments)
  // ========================================
  // The full list of every payment, with search, filters and paging.
  //
  // IMPORTANT: the "status" column is deliberately NOT editable here. Money is
  // never approved by typing a status into a form - it goes through
  // POST /api/admin/fund/decisions, which applies the permission rules and
  // writes the audit trail. That is why the schemas below use .omit().
  //
  // Deleting a payment only HIDES it (soft delete) so the history is complete.
  // ========================================
  'fund-payments': {
    key: 'fund-payments',
    label: 'Collections',
    entity: 'Fund payment',
    delegate: prismaModel('fundPayment'),
    createSchema: adminPaymentSchema.omit({ status: true, reviewNote: true }),
    updateSchema: adminPaymentSchema.omit({ status: true, reviewNote: true }).partial(),
    searchFields: [
      'transactionId',
      'referenceNumber',
      'bankNameSnapshot',
      'purpose',
      'description',
    ],
    statusField: 'status',
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      member: { select: { id: true, name: true, email: true, profile: { select: { membershipNo: true } } } },
      bank: { select: { id: true, name: true } },
      fundCategory: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    // Flatten the member's details, so the table can show the membership number
    // without three-level property paths (the table only reads one level deep).
    decorate: (row) => {
      const member = (row.member ?? {}) as Record<string, unknown>;
      const profile = (member.profile ?? {}) as Record<string, unknown>;

      return {
        ...row,
        memberName: String(member.name ?? ''),
        memberEmail: String(member.email ?? ''),
        memberCode: profile.membershipNo ? String(profile.membershipNo) : null,
      };
    },
    custom: {
      // Soft delete: hide the row, recalculate the month, keep the audit trail.
      remove: (id, user) => removePayment(id, user),
    },
  },

  // ========================================
  // FUND MANAGEMENT - EXPENSES
  // ========================================
  // Same idea as collections: "status" is not editable from this form, and
  // deleting only hides the row.
  // ========================================
  expenses: {
    key: 'expenses',
    label: 'Expenses',
    entity: 'Expense',
    delegate: prismaModel('expense'),
    createSchema: expenseSchema.omit({ status: true }),
    updateSchema: expenseSchema.omit({ status: true }).partial(),
    searchFields: ['title', 'paidTo', 'description', 'referenceNumber'],
    statusField: 'status',
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      category: { select: { id: true, name: true } },
      addedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    custom: {
      remove: (id, user) => removeExpense(id, user),
    },
  },

  // ========================================
  // ========================================
  // KARYA SAMITI (à¤•à¤¾à¤°à¥à¤¯ à¤¸à¤®à¤¿à¤¤à¤¿) - COMMITTEE MEMBERS
  // ========================================
  // Managed from  Admin Panel -> Karya Samiti.
  //
  // The PUBLIC page /karya-samiti does NOT use this resource and does not even
  // read these rows through it: it uses lib/karya/queries.ts, which loads only
  // the four public columns. This resource loads everything, so it is reachable
  // only behind requireAdminApi().
  //
  // Deleting a person here really removes the row, because the office asked for
  // it. Preferred practice is to set isActive = false (kept in the records, not
  // shown on the website) or status = FORMER.
  // ========================================
  'karya-samiti': {
    key: 'karya-samiti',
    label: 'Committee members',
    entity: 'Committee member',
    delegate: prismaModel('karyaSamitiMember'),
    createSchema: karyaMemberSchema,
    updateSchema: karyaMemberUpdateSchema,
    searchFields: ['fullName', 'postTitle', 'currentAddress', 'phone', 'memberCode'],
    // The status filter switches between CURRENT and FORMER.
    statusField: 'status',
    orderBy: [{ displayOrder: 'asc' }, { fullName: 'asc' }],
    include: { post: { select: { id: true, name: true, nameEn: true } } },
    // ========================================
    // RESPONSIBILITY NEEDS SOMEBODY TO READ IT
    // ========================================
    // The responsibility is written by the office and read by the member in
    // their own panel. That only works if the email typed here belongs to a real
    // login - otherwise the text would be stored against nobody and the member
    // would open an empty page.
    //
    // So: a responsibility can only be saved when the email matches an account,
    // and when it does we link the account (userId) at the same time. The rule
    // sits on the server, so it holds even if somebody posts to the API directly.
    async beforeSave(data, id) {
      const typed = typeof data.responsibility === 'string' ? data.responsibility.trim() : undefined;

      // Editing something else (a phone number, a photo) never trips this rule.
      if (typed === undefined) return;

      // Nothing written: nothing to check, and an existing link is left alone.
      if (typed === '') return;

      const email =
        typeof data.email === 'string' && data.email.trim() !== ''
          ? data.email.trim()
          : id
            ? (
                await prisma.karyaSamitiMember.findUnique({
                  where: { id },
                  select: { email: true },
                })
              )?.email ?? ''
            : '';

      if (!email) {
        throw new UserFacingError(
          'Add the member\'s email address first. Their responsibility is shown in their own member panel, so it needs an account to belong to.',
          422,
        );
      }

      const account = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
        select: { id: true, role: true },
      });

      if (!account) {
        throw new UserFacingError(
          `No member account uses ${email}. Create or invite the member's account with this address first, then the responsibility can be saved and they will see it in their panel.`,
          422,
        );
      }

      // Linked here so the member panel finds the record even if the address is
      // typed differently later (capital letters, a changed domain, and so on).
      data.userId = account.id;
    },
    custom: {
      // When a row is deleted we first copy the person's name into the activity
      // log, so the audit trail still says who was removed.
      async remove(id, user) {
        const person = await prisma.karyaSamitiMember.findUnique({
          where: { id },
          select: { fullName: true, postTitle: true },
        });

        if (!person) throw new UserFacingError('This committee member no longer exists.', 404);

        await prisma.karyaSamitiMember.delete({ where: { id } });

        await writeActivity({
          actorId: user.id,
          actorName: user.name,
          action: 'DELETE',
          entity: 'Committee member',
          entityId: id,
          detail: `${person.fullName} (${person.postTitle}) was removed from the committee list`,
        });
      },
    },
  },

  // ========================================
  // DUTIES OF EACH POST (Admin -> Karya Samiti -> Role duties)
  // ========================================
  // WHAT THIS TABLE IS
  //   Lines like "अध्यक्ष: संस्थाको नेतृत्व गर्ने". Each line is tied to ONE member
  //   account by EMAIL, which is how the member panel knows whose duties these are.
  //
  // WHY THE EMAIL IS CHECKED HERE
  //   A duty addressed to an address that has no account would be written into the
  //   database and then never appear anywhere - a silent failure. So the server
  //   looks the account up first and refuses the row if it is missing.
  //
  // OLDER ROWS (no memberUserId)
  //   They belong to the POST, and are shown to everybody who holds that post. The
  //   member panel reads both kinds (see app/member/(panel)/duties/page.tsx).
  'roleduties': {
    key: 'roleduties',
    label: 'Duties of each post',
    entity: 'Role responsibility',
    delegate: prismaModel('committeeRoleDuty'),
    createSchema: roleDutySchema,
    updateSchema: roleDutySchema.partial(),
    searchFields: ['postTitle', 'description', 'memberEmail', 'memberName', 'memberPhone'],
    statusField: 'isActive',
    orderBy: [{ postTitle: 'asc' }, { sortOrder: 'asc' }],
    custom: {
      async create(data, currentUser) {
        const email = String(data.memberEmail ?? '').trim().toLowerCase();
        const account = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, phone: true },
        });

        // NO ACCOUNT YET IS NOT AN ERROR.
        // The office may write the duty before that person has been given an
        // account. The address is stored as typed, memberUserId stays empty, and
        // the member panel matches on the email as well - so the duty appears the
        // moment an account with that address exists.
        const row = await prisma.committeeRoleDuty.create({
          data: {
            postTitle: String(data.postTitle),
            description: String(data.description),
            sortOrder: Number(data.sortOrder ?? 0),
            isActive: data.isActive === undefined ? true : Boolean(data.isActive),
            memberEmail: email,
            memberUserId: account?.id ?? null,
            // The form's name and phone win; the account fills any gap.
            memberName: data.memberName ? String(data.memberName) : (account?.name ?? null),
            memberPhone: data.memberPhone ? String(data.memberPhone) : (account?.phone ?? null),
          },
        });

        await writeActivity({
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: 'CREATE',
          entity: 'Role responsibility',
          entityId: row.id,
          detail: `${row.postTitle}: duty for ${row.memberName} (${email})`,
        });

        return row;
      },

      async update(id, data, currentUser) {
        const before = await prisma.committeeRoleDuty.findUnique({ where: { id } });
        if (!before) throw new UserFacingError('This responsibility no longer exists.', 404);

        const patch: Record<string, unknown> = {};
        if (data.postTitle !== undefined) patch.postTitle = String(data.postTitle);
        if (data.description !== undefined) patch.description = String(data.description);
        if (data.sortOrder !== undefined) patch.sortOrder = Number(data.sortOrder);
        if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);
        if (data.memberName !== undefined) patch.memberName = String(data.memberName);
        if (data.memberPhone !== undefined) patch.memberPhone = String(data.memberPhone);

        // Re-point the duty if the email changed.
        if (data.memberEmail !== undefined) {
          const email = String(data.memberEmail).trim().toLowerCase();
          const account = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, phone: true },
          });
          // Same rule as create: any address is allowed; a matching account is
          // linked, a missing one simply stays unlinked until it exists.
          patch.memberEmail = email;
          patch.memberUserId = account?.id ?? null;
          if (data.memberName === undefined && account) patch.memberName = account.name;
          if (data.memberPhone === undefined && account) patch.memberPhone = account.phone;
        }

        const row = await prisma.committeeRoleDuty.update({ where: { id }, data: patch });

        await writeActivity({
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: 'UPDATE',
          entity: 'Role responsibility',
          entityId: id,
          detail: `${row.postTitle}: duty for ${row.memberName ?? 'the post'} was changed`,
        });

        return row;
      },
    },
  },

  // ========================================
  // KARYA SAMITI - POSTS / POSITIONS
  // ========================================
  // à¤…à¤§à¥à¤¯à¤•à¥à¤·, à¤‰à¤ªà¤¾à¤§à¥à¤¯à¤•à¥à¤·, à¤¸à¤šà¤¿à¤µ... The organization may add any position it needs.
  // A position that is already used by somebody is not deleted - it is switched
  // off, so old records keep a readable post name.
  // ========================================
  'karya-posts': {
    key: 'karya-posts',
    label: 'Committee posts',
    entity: 'Committee post',
    delegate: prismaModel('karyaSamitiPost'),
    createSchema: karyaPostSchema,
    updateSchema: karyaPostSchema.partial(),
    searchFields: ['name', 'nameEn', 'description'],
    statusField: 'isActive',
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    custom: {
      async remove(id) {
        const used = await prisma.karyaSamitiMember.count({ where: { postId: id, isDeleted: false } });

        if (used > 0) {
          throw new UserFacingError(
            `${used} committee member(s) currently hold this position. Switch it off instead of deleting it.`,
          );
        }

        await prisma.karyaSamitiPost.delete({ where: { id } });
      },
    },
  },

  // ========================================
  // ========================================
  // LOAN MANAGEMENT (Super Admin)
  // ========================================
  // Managed from  Admin Panel -> Loans.
  //
  // WHO MAY USE IT
  //   readRoles / writeRoles are SUPER_ADMIN only, which is what the
  //   organization asked for, and it is enforced on the SERVER in
  //   app/api/admin/[resource]/route.ts. To let a Finance Administrator see it
  //   as well, add 'FINANCE_ADMIN' to readRoles below - nothing else changes.
  //
  // WHY EVERY ACTION IS HAND-WRITTEN
  //   The generic engine is NOT used for creating, changing or removing a loan
  //   (see custom{} below). A loan's status must never be typed into a form, and
  //   every change has to be recalculated, audited and notified. Doing that by
  //   hand is what keeps the dashboard totals honest.
  //
  // REPAYMENTS ARE NOT A RESOURCE ON PURPOSE
  //   A repayment can only be added or removed through
  //   /api/admin/loans/returns, which recalculates the loan balance at the same
  //   moment. If it were a normal table in this registry, an administrator could
  //   add a repayment that never touched the balance.
  // ========================================
  loans: {
    key: 'loans',
    label: 'Loans',
    entity: 'Loan',
    delegate: prismaModel('loan'),
    createSchema: loanSchema,
    updateSchema: loanUpdateSchema,
    searchFields: ['loanNo', 'purpose', 'notes', 'rejectionReason'],
    statusField: 'status',
    orderBy: [{ createdAt: 'desc' }],
    include: {
      member: { select: { id: true, name: true, email: true, phone: true } },
      // Only the amounts are needed to work out the balance.
      returns: { select: { amount: true, isDeleted: true } },
    },
    readRoles: ['SUPER_ADMIN'],
    writeRoles: ['SUPER_ADMIN'],
    // Removing a loan changes the financial reports, so only a Super Admin may
    // do it - and the removal is a soft delete (see lib/loan/service.ts).
    deleteSuperAdminOnly: true,
    decorate: (row) => {
      const member = (row.member ?? {}) as Record<string, unknown>;
      const returns = (row.returns ?? []) as { amount: number; isDeleted?: boolean }[];

      const figures = loanFigures({
        principalAmount: Number(row.principalAmount ?? 0),
        interestAmount: Number(row.interestAmount ?? 0),
        returns,
      });

      // These flattened values are what the table and the cards show, so the
      // page never has to work the money out again (and can never disagree
      // with the server about it).
      return {
        ...row,
        // The status that is TRUE RIGHT NOW, not the value written on the row.
        // A loan whose deadline has passed therefore shows as Overdue here at
        // once, so the table can never quietly disagree with the loan's own
        // page. (The stored column is brought in line by refreshLoanStatuses()
        // when the loan screens are opened.)
        status: deriveLoanStatus({
          status: String(row.status ?? 'PENDING'),
          principalAmount: Number(row.principalAmount ?? 0),
          interestAmount: Number(row.interestAmount ?? 0),
          disbursedDate: (row.disbursedDate as Date) ?? null,
          givenDate: (row.givenDate as Date) ?? null,
          expectedReturnDate: (row.expectedReturnDate as Date) ?? null,
          returns,
        }),
        memberName: String(member.name ?? ''),
        memberEmail: String(member.email ?? ''),
        memberPhone: String(member.phone ?? ''),
        payableAmount: figures.payable,
        returnedAmount: figures.returned,
        remainingAmount: figures.remaining,
        repaidPercent: figures.repaidPercent,
        returnCount: figures.returnCount,
      };
    },
    custom: {
      create: (data, user) => createLoan(data, user),
      update: (id, data, user) => updateLoan(id, data, user),
      remove: (id, user) => deleteLoan(id, user),
    },
  },

  // ========================================
  // ========================================
  // DISTRICT WORK (77 DISTRICTS)
  // ========================================
  // Managed from  Admin Panel -> District activities.
  //
  // It records what the organization did in each district, with the figures it
  // actually recorded. The analytics screen (lib/district/analytics.ts) adds
  // them up; no total is ever stored.
  //
  // Every administrator may keep these records (the office types them in), and
  // the totals are there for everybody to see. Removing one HIDES it instead of
  // destroying it, because the numbers on the analytics screen would otherwise
  // change with nothing left to explain why.
  // ========================================
  'district-activities': {
    key: 'district-activities',
    label: 'District activities',
    entity: 'District activity',

    delegate: prismaModel('districtActivity'),
    createSchema: districtActivitySchema,
    updateSchema: districtActivityUpdateSchema,

    searchFields: ['title', 'district', 'municipality', 'responsibleTeam'],
    statusField: 'status',
    orderBy: [{ activityDate: 'desc' }, { createdAt: 'desc' }],

    custom: {
      // --- Create: remember WHO added it ---
      async create(data, currentUser) {
        const created = await prisma.districtActivity.create({
          data: {
            ...(data as Record<string, unknown>),
            createdById: currentUser.id,
            updatedById: currentUser.id,
          } as never,
        });

        await writeActivity({
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: 'CREATE',
          entity: 'District activity',
          entityId: created.id,
          detail: `${created.district}: ${created.title}`,
        });

        return created as unknown as Record<string, unknown>;
      },

      // --- Update: remember who changed it, and what changed ---
      async update(id, data, currentUser) {
        const before = await prisma.districtActivity.findUnique({ where: { id } });
        if (!before || before.isDeleted) {
          throw new UserFacingError('That district activity no longer exists.');
        }

        const updated = await prisma.districtActivity.update({
          where: { id },
          data: { ...(data as Record<string, unknown>), updatedById: currentUser.id } as never,
        });

        await writeActivity({
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: 'UPDATE',
          entity: 'District activity',
          entityId: id,
          detail: `${updated.district}: ${updated.title}`,
          oldValue: `status ${before.status}, beneficiaries ${before.beneficiaries ?? '-'}`,
          newValue: `status ${updated.status}, beneficiaries ${updated.beneficiaries ?? '-'}`,
        });

        return updated as unknown as Record<string, unknown>;
      },

      // --- Remove: HIDE the row, keep it for the history ---
      async remove(id, currentUser) {
        const before = await prisma.districtActivity.findUnique({ where: { id } });
        if (!before || before.isDeleted) {
          throw new UserFacingError('That district activity was already removed.');
        }

        await prisma.districtActivity.update({
          where: { id },
          data: { isDeleted: true, updatedById: currentUser.id },
        });

        await writeActivity({
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: 'DELETE',
          entity: 'District activity',
          entityId: id,
          detail: `removed ${before.district}: ${before.title}`,
          oldValue: before.title,
          newValue: null,
        });
      },
    },
  },
};

// ========================================
// LOOKUP HELPERS
// ========================================

/** Find a section by its URL key. Returns null for unknown keys. */
export function getResource(key: string): ResourceConfig | null {
  return RESOURCES[key] ?? null;
}

/** All keys, used to build the API route. */
export const RESOURCE_KEYS = Object.keys(RESOURCES);

/**
 * A friendly note for the console when a database engine limitation is hit.
 * (Search is case-sensitive on a local SQLite database.)
 */
export const SEARCH_NOTE = isSqlite()
  ? 'Local SQLite database detected: search is case-sensitive.'
  : '';


