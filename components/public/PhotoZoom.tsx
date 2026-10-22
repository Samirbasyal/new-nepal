'use client';

// ========================================
// SEE ANY PHOTO AT FULL SIZE
// ========================================
// The banner photograph, the pictures on the project and programme cards, the
// gallery and the member photos all open large when they are clicked - without
// leaving the page and without losing where the visitor was.
//
// HOW IT WORKS
//   Any picture can be marked with one attribute:
//
//     <Image data-photo-full="/the/image.jpg" ... />
//
//   This component listens once for clicks anywhere on the public website. If
//   the thing that was clicked (or anything around it) carries that attribute,
//   the full-size picture opens in a dark overlay instead of following the card
//   link. One listener is enough, so no page has to carry its own viewer.
//
// CLOSING
//   The X button, a click on the dark background, or the ESC key.
// ========================================

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function PhotoZoom() {
  const [src, setSrc] = useState<string | null>(null);
  const [alt, setAlt] = useState('');

  const close = useCallback(() => setSrc(null), []);

  // ---------- One listener for the whole website ----------
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const holder = target?.closest?.('[data-photo-full]') as HTMLElement | null;
      if (!holder) return;

      const url = holder.getAttribute('data-photo-full');
      if (!url) return;

      // The picture sits inside a card link; opening the photo must win.
      event.preventDefault();
      event.stopPropagation();

      setAlt(holder.getAttribute('data-photo-alt') ?? '');
      setSrc(url);
    };

    // Capture phase: the overlay opens before the link can navigate.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // ---------- Keyboard ----------
  useEffect(() => {
    if (!src) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [src, close]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Photo'}
      onClick={close}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close photo"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
      >
        <Icon name="close" className="h-5 w-5" />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}
