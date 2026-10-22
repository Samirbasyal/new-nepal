import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - PERMANENT DUTIES FOR A POST
// ========================================
// Address: /admin/karya-samiti/role-duties
//
// These lines belong to the POST, not to a person. Whoever holds "अध्यक्ष" sees
// the अध्यक्ष list in their member panel, automatically. Change a line here and
// it changes for every holder of that post, now and in the future.
//
// HOW IT MATCHES
//   CommitteeRoleDuty.postTitle must be written EXACTLY as the post title on the
//   committee members (KaryaSamitiMember.postTitle). The dropdown below lists the
//   post names that already exist, so the spelling is never guessed.
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.roleDuties'), robots: { index: false, follow: false } };
}

const COLUMNS: ColumnConfig[] = [
  { name: 'memberName', label: 'Member' },
  { name: 'memberEmail', label: 'Email' },
  { name: 'postTitle', label: 'Post' },
  { name: 'description', label: 'Responsibility' },
  { name: 'memberPhone', label: 'Phone', hideOnMobile: true },
  { name: 'sortOrder', label: 'Order', hideOnMobile: true },
];

export default async function AdminRoleDutiesPage() {
  // Every post name that is actually in use, so the office picks from real ones.
  const [posts, members] = isDatabaseConfigured()
    ? await Promise.all([
        prisma.karyaSamitiPost.findMany({ select: { name: true }, orderBy: { sortOrder: 'asc' } }).catch(() => []),
        prisma.karyaSamitiMember
          .findMany({ where: { isDeleted: false }, select: { postTitle: true }, distinct: ['postTitle'] })
          .catch(() => []),
      ])
    : [[], []];

  const titles = Array.from(
    new Set([...posts.map((post) => post.name), ...members.map((member) => member.postTitle)]),
  )
    .filter(Boolean)
    .sort();

  const postOptions = titles.map((title) => ({ value: title, label: title }));

  // ---------- who the duty can be given to ----------
  // Only real member accounts: the email is the link between this row and the
  // member panel, so a duty sent to an address with no account would vanish.
  const accounts = isDatabaseConfigured()
    ? await prisma.user
        .findMany({
          where: { role: 'MEMBER', isActive: true },
          select: { name: true, email: true, phone: true },
          orderBy: { name: 'asc' },
          take: 500,
        })
        .catch(() => [])
    : [];

  const memberOptions = accounts.map((account) => ({
    value: account.email,
    label: `${account.name} - ${account.email}`,
  }));

  const FIELDS: FieldConfig[] = [
    // ---------- WHO ----------
    {
      name: 'memberEmail',
      label: 'Member email (required)',
      type: 'select',
      required: true,
      options: memberOptions,
      hint:
        memberOptions.length === 0
          ? 'No member accounts yet. Add a member first (Members page), then come back.'
          : 'The account this duty belongs to. This is what makes it appear in their member panel.',
      section: 'Who this duty belongs to',
    },
    {
      name: 'memberName',
      label: 'Member name (required)',
      type: 'text',
      required: true,
      hint: 'Written on the row too, so the office can read it without opening the account.',
      section: 'Who this duty belongs to',
    },
    {
      name: 'memberPhone',
      label: 'Phone number (required)',
      type: 'text',
      required: true,
      placeholder: '98XXXXXXXX',
      section: 'Who this duty belongs to',
    },

    // ---------- WHAT ----------
    {
      name: 'postTitle',
      label: 'Post (पद)',
      type: 'select',
      required: true,
      options: postOptions,
      hint:
        postOptions.length === 0
          ? 'Add a committee post first (Committee posts page).'
          : 'Exactly the post name used on the committee members.',
      section: 'The duty',
    },
    {
      name: 'description',
      label: 'Responsibility',
      type: 'textarea',
      required: true,
      hint: 'Write one duty as one sentence, e.g. "संस्थाको नेतृत्व गर्ने र सम्पूर्ण कार्यको निगरानी गर्ने।"',
      section: 'The duty',
    },
    {
      name: 'sortOrder',
      label: 'Order',
      type: 'number',
      hint: 'Lower numbers are listed first.',
      section: 'The duty',
    },
  ];

  return (
    <ResourceManager
      resourceKey="roleduties"
      entityLabel="Role responsibility"
      title="Permanent duties for a post"
      description="Duties that come with a post. Everyone who holds that post sees these in their member panel without any extra assignment."
      fields={FIELDS}
      columns={COLUMNS}
      defaults={{ sortOrder: 0, isActive: true }}
    />
  );
}
