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

export const metadata: Metadata = {
  title: 'Role responsibilities',
  robots: { index: false, follow: false },
};

const COLUMNS: ColumnConfig[] = [
  { name: 'postTitle', label: 'Post' },
  { name: 'description', label: 'Responsibility' },
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

  const FIELDS: FieldConfig[] = [
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
      section: 'Permanent duty',
    },
    {
      name: 'description',
      label: 'Responsibility',
      type: 'textarea',
      required: true,
      hint: 'Write one duty as one sentence, e.g. "संस्थाको नेतृत्व गर्ने र सम्पूर्ण कार्यको निगरानी गर्ने।"',
      section: 'Permanent duty',
    },
    {
      name: 'sortOrder',
      label: 'Order',
      type: 'number',
      hint: 'Lower numbers are listed first.',
      section: 'Permanent duty',
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
