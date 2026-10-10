// ========================================
// ADMIN PANEL
// This code controls the Gallery manager.
// ========================================
// Address: /admin/gallery            -> albums tab
//          /admin/gallery?tab=photos -> photos tab
//
// TWO MANAGERS IN ONE PLACE
//   1. GALLERY ALBUMS - groups of photos (for example "Health camp 2026")
//   2. GALLERY PHOTOS - the individual pictures, with captions
//
// A photo can be linked to an album, a program, a project or an event so it
// also appears on that page.
//
// The validation rules live in lib/validation/schemas.ts
//   -> galleryAlbumSchema and galleryImageSchema
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Gallery',
  robots: { index: false, follow: false },
};

// ========================================
// LOOK-UP LISTS FOR THE PHOTO FORM
// ========================================
async function getLookups() {
  if (!isDatabaseConfigured()) {
    return { albums: [], programs: [], projects: [], events: [] };
  }

  try {
    const [albums, programs, projects, events] = await Promise.all([
      prisma.galleryAlbum.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
      prisma.program.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
      prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
      prisma.event.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    ]);

    const toOptions = (rows: { id: string; title: string }[]) =>
      rows.map((row) => ({ value: row.id, label: row.title }));

    return {
      albums: toOptions(albums),
      programs: toOptions(programs),
      projects: toOptions(projects),
      events: toOptions(events),
    };
  } catch {
    return { albums: [], programs: [], projects: [], events: [] };
  }
}

// ========================================
// ALBUM FIELDS AND COLUMNS
// ========================================
const ALBUM_COLUMNS: ColumnConfig[] = [
  { name: 'title', label: 'Album' },
  { name: 'category', label: 'Category', hideOnMobile: true },
  { name: 'eventDate', label: 'Date', type: 'date', hideOnMobile: true },
  { name: 'isPublished', label: 'Published', toggle: true },
];

const ALBUM_FIELDS: FieldConfig[] = [
  { name: 'title', label: 'Album title', type: 'text', required: true, section: 'Album' },
  { name: 'category', label: 'Category', type: 'text', placeholder: 'For example: Health, Education', section: 'Album' },
  { name: 'eventDate', label: 'Date of the activity', type: 'date', section: 'Album' },
  { name: 'description', label: 'Description', type: 'textarea', section: 'Album' },
  { name: 'coverImageUrl', label: 'Album cover picture', type: 'image', uploadable: true, section: 'Album' },
  { name: 'isPublished', label: 'Published on the website', type: 'checkbox', section: 'Publishing' },
  { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.', section: 'Publishing' },
  { name: 'slug', label: 'Web address (advanced)', type: 'text', section: 'Publishing' },
];

// ========================================
// PHOTO FIELDS AND COLUMNS
// ========================================
const PHOTO_COLUMNS: ColumnConfig[] = [
  { name: 'imageUrl', label: 'Photo', type: 'image' },
  { name: 'title', label: 'Caption' },
  { name: 'category', label: 'Category', hideOnMobile: true },
  { name: 'takenOn', label: 'Date', type: 'date', hideOnMobile: true },
  { name: 'isPublished', label: 'Visible', toggle: true },
];

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === 'photos' ? 'photos' : 'albums';

  const lookups = await getLookups();

  const PHOTO_FIELDS: FieldConfig[] = [
    {
      name: 'imageUrl',
      label: 'Photo',
      type: 'image',
      required: true,
      uploadable: true,
      hint: 'Paste a link to a photo that is already online, or upload one (works while developing locally).',
      section: 'Photo',
    },
    {
      name: 'title',
      label: 'Caption',
      type: 'text',
      hint: 'Shown under the photo and in the photo viewer.',
      section: 'Photo',
    },
    { name: 'category', label: 'Category', type: 'text', section: 'Photo' },
    { name: 'takenOn', label: 'Date taken', type: 'date', section: 'Photo' },
    {
      name: 'albumId',
      label: 'Album',
      type: 'select',
      options: lookups.albums,
      hint: lookups.albums.length === 0 ? 'No albums yet. Create one in the Albums tab.' : 'Optional.',
      section: 'Photo',
    },

    // ---------- Link the photo to other content ----------
    { name: 'programId', label: 'Related program', type: 'select', options: lookups.programs, hint: 'Optional.', section: 'Show it on another page' },
    { name: 'projectId', label: 'Related project / work', type: 'select', options: lookups.projects, hint: 'Optional. It will also appear on that project page.', section: 'Show it on another page' },
    { name: 'eventId', label: 'Related event', type: 'select', options: lookups.events, hint: 'Optional. It will also appear on that event page.', section: 'Show it on another page' },

    // ---------- Visibility ----------
    { name: 'isPublished', label: 'Visible on the website', type: 'checkbox', section: 'Publishing' },
    { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.', section: 'Publishing' },
  ];

  const tabs = [
    { key: 'albums', label: 'Albums', href: '/admin/gallery' },
    { key: 'photos', label: 'Photos', href: '/admin/gallery?tab=photos' },
  ];

  return (
    <div className="space-y-6">
      {/* ========================================
          HEADING + TABS
          ======================================== */}
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900">Gallery</h1>
        <p className="mt-1 text-sm text-ink-600">
          Photos appear on /gallery. A photo linked to a program, project or event also appears on
          that page.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Gallery sections">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
              tab === item.key
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* ========================================
          THE MANAGER FOR THE SELECTED TAB
          ======================================== */}
      {tab === 'albums' ? (
        <ResourceManager
          resourceKey="gallery-albums"
          entityLabel="Album"
          title="Gallery albums"
          description="Group photos into albums. The album page shows every photo inside it."
          fields={ALBUM_FIELDS}
          columns={ALBUM_COLUMNS}
          defaults={{ isPublished: true, sortOrder: 0 }}
        />
      ) : (
        <ResourceManager
          resourceKey="gallery-images"
          entityLabel="Photo"
          title="Gallery photos"
          description="Individual photographs with captions. Only use pictures you have permission to publish."
          fields={PHOTO_FIELDS}
          columns={PHOTO_COLUMNS}
          defaults={{ isPublished: true, sortOrder: 0 }}
          pageSize={12}
        />
      )}

      {/* ========================================
          LEGAL REMINDER
          ======================================== */}
      <p className="rounded-card border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <strong>Please only upload your own photographs.</strong> Do not copy pictures from other
        websites, search engines or social media pages. If a person is clearly recognisable in a
        photo, make sure you have their permission before publishing it.
      </p>
    </div>
  );
}
