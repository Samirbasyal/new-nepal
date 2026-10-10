// ========================================
// ADMIN PANEL
// This code controls the News & Notices manager.
// ========================================
// Address: /admin/news
//
// Articles appear on /news with their own page at /news/<address>.
//
// HOW TO FORMAT AN ARTICLE (plain text, no HTML needed)
//   blank line       -> new paragraph
//   # Heading        -> a small heading
//   - item           -> a bullet point
//   **word**         -> bold text
//
// The validation rules live in lib/validation/schemas.ts -> newsSchema
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { NEWS_TYPE_OPTIONS } from '@/lib/constants';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'News and notices',
  robots: { index: false, follow: false },
};

const COLUMNS: ColumnConfig[] = [
  { name: 'title', label: 'Title' },
  { name: 'type', label: 'Type', type: 'badge' },
  { name: 'publishedAt', label: 'Date', type: 'date', hideOnMobile: true },
  { name: 'isPublished', label: 'Published', toggle: true },
];

const FIELDS: FieldConfig[] = [
  // ---------- Basics ----------
  { name: 'title', label: 'Title', type: 'text', required: true, section: 'Article' },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    options: NEWS_TYPE_OPTIONS,
    hint: 'Notices and News are both listed on /news and can be filtered there.',
    section: 'Article',
  },
  { name: 'category', label: 'Category', type: 'text', placeholder: 'For example: Announcement', section: 'Article' },
  {
    name: 'excerpt',
    label: 'Short summary',
    type: 'textarea',
    hint: 'Shown on the listing page and in search results.',
    section: 'Article',
  },
  {
    name: 'content',
    label: 'Full article',
    type: 'textarea',
    hint: 'Plain text. Blank line = new paragraph, "# " = heading, "- " = bullet, **bold**.',
    section: 'Article',
  },
  {
    name: 'publishedAt',
    label: 'Article date',
    type: 'date',
    hint: 'The date shown on the website. Leave empty to use today.',
    section: 'Article',
  },

  // ---------- Picture ----------
  { name: 'coverImageUrl', label: 'Featured picture', type: 'image', uploadable: true, section: 'Picture' },

  // ---------- Publishing ----------
  { name: 'isPublished', label: 'Published on the website', type: 'checkbox', section: 'Publishing' },
  { name: 'featured', label: 'Featured', type: 'checkbox', section: 'Publishing' },
  { name: 'slug', label: 'Web address (advanced)', type: 'text', section: 'Publishing' },
];

export default function AdminNewsPage() {
  return (
    <ResourceManager
      resourceKey="news"
      entityLabel="Article"
      title="News & Notices"
      description="Articles for /news. Use the Type field to separate news, notices, press releases and stories."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={NEWS_TYPE_OPTIONS}
      statusField="type"
      defaults={{ type: 'NEWS', isPublished: false, featured: false }}
    />
  );
}
