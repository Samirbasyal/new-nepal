// ========================================
// GALLERY SECTION
// This code controls the Gallery page.
// ========================================
// Address: /gallery
//
//   ?album=<address-of-the-album>  -> show only one album
//
// WHAT IS SHOWN
//   - every PUBLISHED photo
//   - grouped by album when albums exist
//   - captions, categories and dates (all set in the Admin Panel)
//   - a click-to-enlarge viewer (see components/public/GalleryGrid.tsx)
//
// HOW TO ADD PHOTOS
//   Admin Panel -> Gallery -> Gallery photos. You can paste a link to an image
//   or (while working locally) upload a file. Never copy pictures from another
//   website without permission.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { AlbumCard } from '@/components/public/Cards';
import { GalleryGrid } from '@/components/public/GalleryGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHero, Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { getGalleryAlbums, getGalleryImages } from '@/lib/data/public';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Photographs from the activities, events and programs of Janakalyan Samataa Yuwa Club.',
};

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string }>;
}) {
  const params = await searchParams;
  const albumSlug = params.album?.trim() || undefined;

  const [albums, allPhotos] = await Promise.all([
    getGalleryAlbums(),
    getGalleryImages(),
  ]);

  const selectedAlbum = albumSlug
    ? albums.find((album) => album.slug === albumSlug)
    : undefined;

  // When a single album is open we only show the photos inside it.
  const photos = selectedAlbum
    ? allPhotos.filter((photo) => photo.album?.slug === selectedAlbum.slug)
    : allPhotos;

  const hasAnything = allPhotos.length > 0 || albums.length > 0;

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        icon="image"
        title={selectedAlbum ? selectedAlbum.title : 'Gallery'}
        description={
          selectedAlbum?.description ||
          'Photographs from our activities, events and everyday work in the community.'
        }
      />

      {/* ========================================
          ALBUM FILTER
          ======================================== */}
      {albums.length > 0 ? (
        <Section tight>
          <nav className="flex flex-wrap gap-2" aria-label="Filter by album">
            <Link
              href="/gallery"
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                !selectedAlbum
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
              )}
            >
              All photos ({allPhotos.length})
            </Link>

            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/gallery?album=${album.slug}`}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                  selectedAlbum?.id === album.id
                    ? 'bg-brand-600 text-white ring-brand-600'
                    : 'bg-white text-ink-700 ring-ink-300 hover:bg-ink-50',
                )}
              >
                {album.title} ({album._count?.images ?? album.images.length})
              </Link>
            ))}
          </nav>
        </Section>
      ) : null}

      {/* ========================================
          PHOTOS
          ======================================== */}
      <Section>
        {photos.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-ink-500">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}. Click any photo to view it
              larger.
            </p>

            <GalleryGrid photos={photos} />
          </>
        ) : hasAnything ? (
          <EmptyState
            icon="image"
            title="This album has no photos yet"
            description="Photos added in Admin Panel → Gallery appear here. Choose a different album above, or add photos to this one."
          />
        ) : (
          <EmptyState
            icon="image"
            title="Photos will appear here"
            description="Add photos from Admin Panel → Gallery. Each photo can have a caption, a category, a date and a link to a program, project or event. Please only upload pictures you have permission to use."
          />
        )}
      </Section>

      {/* ========================================
          ALBUM OVERVIEW
          ======================================== */}
      {albums.length > 0 && !selectedAlbum ? (
        <Section muted>
          <SectionHeading
            eyebrow="Albums"
            icon="folder"
            title="Browse by album"
            description="Photos grouped by activity, event or year."
          />

          <CardGrid>
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {/* ========================================
          NOTE ABOUT IMAGE CREDITS
          ======================================== */}
      <Section tight>
        <p className="text-center text-xs text-ink-500">
          All photographs on this website are supplied by the organization or used with permission.
        </p>
      </Section>
    </>
  );
}
