// ========================================
// GALLERY SECTION
// This code controls the Gallery grid and the photo viewer (lightbox).
// ========================================
// HOW IT WORKS
//   - Every photo is shown as an equal SQUARE thumbnail, in a neat grid.
//   - Cover-fit keeps the square filled without stretching or squashing the
//     picture (object-cover crops instead of distorting).
//   - Clicking a photo opens it larger. The viewer shows ONLY the photo, at its
//     own shape, sized to fit the screen - never wider or taller than the
//     window, so it never looks unbalanced and never scrolls sideways.
//   - Close with the X button, by clicking the dark background, or with ESC.
//   - Arrow buttons move to the previous / next photo.
//
// WHY THE VIEWER NO LONGER HAS A FIXED 4:3 FRAME
//   The old viewer put every photo inside a 4:3 box with object-contain. A tall
//   photo therefore appeared small, with empty bars either side, and a wide
//   photo was pushed into a shape it did not have. The photo now keeps its own
//   proportions and is limited only by the height and width of the screen.
// ========================================

'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

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

  // ---------- ZOOM ----------
  // The picture is shown fitted to the screen first. Pressing the magnifier (or
  // double-clicking the photo) switches to a larger copy inside a scrollable
  // frame, so a wide group photo can actually be read. Every new photo starts
  // fitted again - a zoomed view is never carried across.
  const [zoomed, setZoomed] = useState(false);

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

  // A different photo, or the viewer closed: back to the fitted view.
  useEffect(() => {
    setZoomed(false);
  }, [openIndex]);

  if (photos.length === 0) return null;

  return (
    <>
      {/* ---------- THE PHOTO GRID ----------
          Two columns on a phone, three from 640px up. Staying at three on a
          large screen keeps every square bigger and easier to see than the old
          four-across layout, which made them small. */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block w-full overflow-hidden rounded-card bg-ink-100 ring-1 ring-ink-200 transition-shadow hover:shadow-card-hover"
              aria-label={`Open photo: ${photo.title || 'Gallery photo'}`}
            >
              {/* aspect-square = a true 1:1 (2:2) square tile */}
              <div className="relative aspect-square w-full">
                <Image
                  src={photo.imageUrl}
                  alt={photo.title || 'Gallery photo'}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 animate-fade-in sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setOpenIndex(-1)}
        >
          {/* Close button sits on the viewer itself, so it stays reachable even
              when the picture fills the screen on a phone. */}
          <button
            type="button"
            onClick={() => setOpenIndex(-1)}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2.5 text-white ring-1 ring-white/20 hover:bg-black/75 sm:right-5 sm:top-5"
            aria-label="Close photo viewer"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>

          {/* ---------- CLOSE ---------- */}
          {/* (kept below with the other controls) */}
          {/* ---------- ZOOM ---------- */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((value) => !value);
            }}
            className="absolute left-3 top-3 z-10 rounded-full bg-black/55 p-2.5 text-white ring-1 ring-white/20 hover:bg-black/75 sm:left-5 sm:top-5"
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
            aria-pressed={zoomed}
          >
            <Icon name={zoomed ? 'zoom-out' : 'zoom-in'} className="h-5 w-5" />
          </button>

          {/* Only the picture. Fitted to the screen by default; when zoomed it
              lives in a scrollable frame so it can be moved around without ever
              pushing the page sideways. */}
          <div
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={() => setZoomed((value) => !value)}
            className={cn(
              'max-w-[94vw] rounded-lg',
              zoomed ? 'max-h-[84vh] cursor-zoom-out overflow-auto' : 'overflow-hidden',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.imageUrl}
              alt={current.title || 'Gallery photo'}
              className={cn(
                'rounded-lg object-contain shadow-2xl',
                zoomed
                  ? 'w-[190vw] max-w-none sm:w-[130vw] lg:w-[110vw]'
                  : 'h-auto max-h-[80vh] w-auto max-w-[92vw] sm:max-h-[84vh]',
              )}
            />
          </div>

          {/* Previous / next buttons */}
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((index) => (index - 1 + photos.length) % photos.length);
                }}
                className={cn(
                  'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2.5 text-white ring-1 ring-white/20',
                  'hover:bg-black/75 sm:left-4',
                )}
                aria-label="Previous photo"
              >
                <Icon name="chevron-left" className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((index) => (index + 1) % photos.length);
                }}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2.5 text-white ring-1 ring-white/20',
                  'hover:bg-black/75 sm:right-4',
                )}
                aria-label="Next photo"
              >
                <Icon name="chevron-right" className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
