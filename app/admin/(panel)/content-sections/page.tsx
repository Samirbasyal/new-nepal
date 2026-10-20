import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL
// This code controls the Content Sections manager.
// ========================================
// Address: /admin/content-sections
//          /admin/content-sections?group=WOMEN   (Women Empowered)
//
// WHAT ARE CONTENT SECTIONS?
//   Long text blocks that the organization can rewrite without touching code:
//   "Who we are", "Vision", "Mission", "Objectives", "Core values",
//   "What we do", "Our approach", the Women Empowered introduction and more.
//
// EACH BLOCK HAS
//   title       the heading shown on the page
//   slug        a short name used to place it correctly, for example "vision"
//   group       which page it belongs to (About, Home, Women, ...)
//   sortOrder   the order within the group
//
// USEFUL SLUG NAMES (used by the pages to position the blocks)
//   About page : who-we-are, vision, mission, objectives, core-values,
//                what-we-do, our-approach
//   Women      : women-empowered, story
//   Beneficiaries / Impact : any name you like
//
// The validation rules live in lib/validation/schemas.ts -> contentSectionSchema
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { CONTENT_GROUP_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.contentSections'), robots: { index: false, follow: false } };
}

const COLUMNS: ColumnConfig[] = [
  { name: 'title', label: 'Heading' },
  { name: 'group', label: 'Page group', type: 'badge' },
  { name: 'slug', label: 'Slug', hideOnMobile: true },
  { name: 'sortOrder', label: 'Order', type: 'number', hideOnMobile: true },
  { name: 'isPublished', label: 'Visible', toggle: true },
];

const FIELDS: FieldConfig[] = [
  // ---------- The block ----------
  { name: 'title', label: 'Heading', type: 'text', required: true, placeholder: 'For example: Our vision', section: 'Content' },
  {
    name: 'slug',
    label: 'Placement name (slug)',
    type: 'text',
    hint: 'Used to place the block on the right part of the page. See the notes at the top of this file. Leave empty to build it from the heading.',
    section: 'Content',
  },
  { name: 'subtitle', label: 'Small line under the heading', type: 'text', hint: 'Optional.', section: 'Content' },
  {
    name: 'body',
    label: 'Main text',
    type: 'textarea',
    hint: 'Leave a blank line between paragraphs. Use **word** to make a word bold.',
    section: 'Content',
  },
  {
    name: 'bulletList',
    label: 'Bullet list',
    type: 'lines',
    hint: 'One item per line. Shown as a bullet list next to or under the text.',
    section: 'Content',
  },
  { name: 'imageUrl', label: 'Picture (optional)', type: 'image', uploadable: true, section: 'Content' },

  // ---------- Placement ----------
  { name: 'group', label: 'Which page does this belong to?', type: 'select', options: CONTENT_GROUP_OPTIONS, section: 'Placement' },
  { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.', section: 'Placement' },
  { name: 'isPublished', label: 'Visible on the website', type: 'checkbox', section: 'Placement' },
];

export default async function AdminContentSectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const params = await searchParams;
  const group = CONTENT_GROUP_OPTIONS.some((option) => option.value === params.group)
    ? params.group
    : undefined;

  const groupLabel = CONTENT_GROUP_OPTIONS.find((option) => option.value === group)?.label;

  return (
    <div className="space-y-6">
      {/* ========================================
          GROUP FILTER
          These links let you jump straight to one page's text.
          ======================================== */}
      <nav className="flex flex-wrap gap-2" aria-label="Filter by page group">
        <Link
          href="/admin/content-sections"
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
            !group
              ? 'bg-brand-600 text-white ring-brand-600'
              : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
          )}
        >
          All sections
        </Link>

        {CONTENT_GROUP_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={`/admin/content-sections?group=${option.value}`}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
              group === option.value
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <ResourceManager
        resourceKey="content-sections"
        entityLabel="Content section"
        title={groupLabel ? `Content sections – ${groupLabel}` : 'Content sections'}
        description="Long text blocks used on the About page, homepage, Women Empowered page, Beneficiaries page and Impact page. Anything you write here replaces the placeholder text on the website."
        fields={FIELDS}
        columns={COLUMNS}
        statusOptions={CONTENT_GROUP_OPTIONS}
        statusField="group"
        defaults={{
          group: group ?? 'ABOUT',
          isPublished: true,
          sortOrder: 0,
        }}
      />
    </div>
  );
}
