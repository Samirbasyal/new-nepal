// ========================================
// GALLERY SECTION
// This code controls the Gallery grid and the photo viewer (lightbox).
// ========================================
// HOW IT WORKS
//   - Every photo is shown in a responsive grid.
//   - Clicking a photo opens it larger in a simple viewer.
//   - Press ESC or click the dark background to close it.
//   - Arrow buttons move to the previous / next photo.
//   - Captions come from the Admin Panel (Gallery -> caption field).
// ========================================

'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn, formatDate } from '@/lib/utils';

export type GalleryPhoto = {
  id: string;
  imageUrl: string;
  title?: string | null;
  category?: string | null;
  takenOn?: Date | string | null;
  album?: { title: string } | null;
};

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  // Which photo is currently open in the viewer (-1 = viewer closed).
  const [openIndex, setOpenIndex] = useState(-1);

  const open = openIndex >= 0;
  const current = open ? photos[openIndex] : null;

  // Keyboard support: ESC closes, arrow keys move between photos.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenIndex(-1);
      if (event.key === 'ArrowRight') {
        setOpenIndex((index) => (index + 1) % photos.length);
      }
      if (event.key === 'ArrowLeft') {
        setOpenIndex((index) => (index - 1 + photos.length) % photos.length);
      }
    };

    document.addEventListener('keydown', onKey);
    // Stop the page behind the viewer from scrolling.
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, photos.length]);

  if (photos.length === 0) return null;

  return (
    <>
      {/* ---------- THE PHOTO GRID ---------- */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block w-full overflow-hidden rounded-card bg-ink-100 ring-1 ring-ink-200 transition-shadow hover:shadow-card-hover"
              aria-label={`Open photo: ${photo.title || 'Gallery photo'}`}
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={photo.imageUrl}
                  alt={photo.title || 'Gallery photo'}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized={photo.imageUrl.endsWith('.svg')}
                />
              </div>

              {/* Caption strip appears on hover (and is always in the viewer) */}
              {photo.title ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-6 text-left text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {photo.title}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {/* ---------- THE PHOTO VIEWER (LIGHTBOX) ---------- */}
      {open && current ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setOpenIndex(-1)}
        >
          <div
            className="relative w-full max-w-5xl"
            // Clicks inside the picture must not close the viewer.
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-black">
              <Image
                src={current.imageUrl}
                alt={current.title || 'Gallery photo'}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized={current.imageUrl.endsWith('.svg')}
              />
            </div>

            {/* Caption + date + album */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-white">
              <div>
                {current.title ? <p className="font-semibold">{current.title}</p> : null}
                <p className="text-xs text-white/70">
                  {[current.album?.title, current.category, formatDate(current.takenOn)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              <p className="text-xs text-white/70">
                {openIndex + 1} / {photos.length}
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpenIndex(-1)}
              className="absolute -top-2 right-0 -translate-y-full rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
              aria-label="Close photo viewer"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>

            {/* Previous / next buttons */}
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setOpenIndex((index) => (index - 1 + photos.length) % photos.length)}
                  className={cn(
                    'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white',
                    'hover:bg-black/70',
                  )}
                  aria-label="Previous photo"
                >
                  <Icon name="chevron-left" className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setOpenIndex((index) => (index + 1) % photos.length)}
                  className={cn(
                    'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white',
                    'hover:bg-black/70',
                  )}
                  aria-label="Next photo"
                >
                  <Icon name="chevron-right" className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
