import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL
// This code controls the Karya Samiti posts (positions) list.
// ========================================
// Address: /admin/karya-samiti/posts
//
// WHY THIS SCREEN EXISTS
//   The six usual positions (अध्यक्ष, उपाध्यक्ष, सचिव, सह–सचिव, कोषाध्यक्ष,
//   सदस्य) are only a starting point. The organization may add any position it
//   needs - for example "युवा संयोजक" or "सल्लाहकार" - without asking a
//   programmer, and without changing any code.
//
// WHAT A POSITION IS USED FOR
//   It fills the drop-down on the committee member form and gives the members a
//   sensible starting order. The text printed on the website is still whatever
//   is typed on the member record, so a one-off title is always possible.
//
// DELETING
//   A position that somebody currently holds cannot be deleted (the server
//   refuses, and says how many people hold it). Switch it off instead - old
//   records then keep a readable post name.
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.karyaPosts'), robots: { index: false, follow: false } };
}

const COLUMNS: ColumnConfig[] = [
  { name: 'name', label: 'Position (Nepali)' },
  { name: 'nameEn', label: 'English', hideOnMobile: true },
  { name: 'sortOrder', label: 'Order', type: 'number' },
  { name: 'isActive', label: 'Available', type: 'boolean' },
];

const FIELDS: FieldConfig[] = [
  {
    name: 'name',
    label: 'Position name (Nepali)',
    type: 'text',
    required: true,
    placeholder: 'For example: अध्यक्ष',
    hint: 'This is the text used in the drop-down and in reports.',
    section: 'Position',
  },
  {
    name: 'nameEn',
    label: 'English name (optional)',
    type: 'text',
    placeholder: 'For example: Chairperson',
    section: 'Position',
  },
  {
    name: 'description',
    label: 'What the position is responsible for (optional)',
    type: 'textarea',
    section: 'Position',
  },
  {
    name: 'sortOrder',
    label: 'Order in the list',
    type: 'number',
    hint: 'Smaller numbers come first: 1 Chairperson, 2 Vice chairperson, 3 Secretary...',
    section: 'Position',
  },
  {
    name: 'isActive',
    label: 'Available for new records',
    type: 'checkbox',
    hint: 'Switch off to keep old records readable while hiding it from the drop-down.',
    section: 'Position',
  },
];

export default function AdminKaryaPostsPage() {
  return (
    <ResourceManager
      resourceKey="karya-posts"
      entityLabel="Post"
      title="Committee posts"
      description="The positions a committee member can hold. Add your own - the usual six are only suggestions."
      fields={FIELDS}
      columns={COLUMNS}
      defaults={{ sortOrder: 10, isActive: true }}
    />
  );
}
