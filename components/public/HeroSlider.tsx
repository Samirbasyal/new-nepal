// ========================================
// AUTOMATIC IMAGE SLIDER (HERO)
// ========================================
// WHERE THE PHOTOS COME FROM
//   The gallery albums that administrators already upload in
//   Admin Panel -> Gallery. Nothing new to manage: publish a photo there and it
//   can appear here.
//
// THE RULES THIS FOLLOWS
//   - It changes on its own every 5 seconds, and STOPS the moment the visitor
//     touches it (hover, focus, a swipe, a button). A carousel that keeps moving
//     while somebody is reading it is a carousel that fights the reader.
//   - If the operating system asks for reduced motion, it never auto-plays.
//     The arrows and dots still work.
//   - The frame has a fixed shape, so the page never jumps as slides change.
//   - The first slide is marked priority and the rest load lazily.
// ========================================

'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export type SliderPhoto = {
  id: string;
  imageUrl: string;
  title: string | null;
  category: string | null;
};

export function HeroSlider({ photos }: { photos: SliderPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = photos.length;
  const go = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  // ---------- respect the system's motion preference ----------
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);

    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // ---------- the timer ----------
  useEffect(() => {
    if (paused || reducedMotion || total < 2) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, total]);

  if (total === 0) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Photos of our community work"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          go(index - 1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          go(index + 1);
        }
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX ?? null;
        touchStartX.current = null;
        setPaused(false);

        if (start === null || end === null) return;
        const distance = end - start;

        // A deliberate swipe, not a tap.
        if (Math.abs(distance) > 40) go(distance < 0 ? index + 1 : index - 1);
      }}
      className="group relative w-full overflow-hidden rounded-card bg-brand-900 ring-1 ring-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
    >
      {/* ---------- the frame: fixed shape, so nothing jumps ---------- */}
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-[4/3]">
        {photos.map((photo, position) => (
          <div
            key={photo.id}
            aria-hidden={position !== index}
            className={
              'absolute inset-0 transition-opacity duration-700 ease-out ' +
              (position === index ? 'opacity-100' : 'pointer-events-none opacity-0')
            }
          >
            <Image
              src={photo.imageUrl}
              alt={photo.title ?? 'Community work by Janakalyan Samataa Yuwa Club'}
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
              priority={position === 0}
              loading={position === 0 ? undefined : 'lazy'}
            />

            {/* A soft dark base so the caption stays readable on any photo. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
            />
          </div>
        ))}

        {/* ---------- caption ---------- */}
        {photos[index]?.title || photos[index]?.category ? (
          <div className="absolute inset-x-0 bottom-0 p-4">
            {photos[index]?.category ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-300">
                {photos[index]?.category}
              </p>
            ) : null}
            {photos[index]?.title ? (
              <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">
                {photos[index]?.title}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ---------- arrows ---------- */}
        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/60 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100"
            >
              <Icon name="chevron-left" className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/60 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100"
            >
              <Icon name="chevron-right" className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {/* ---------- dots ---------- */}
      {total > 1 ? (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {photos.map((photo, position) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => go(position)}
              aria-label={`Photo ${position + 1} of ${total}`}
              aria-current={position === index ? 'true' : undefined}
              className={
                'h-1.5 rounded-full transition-all ' +
                (position === index ? 'w-6 bg-accent-400' : 'w-1.5 bg-white/60 hover:bg-white')
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
