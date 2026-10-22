'use client';

// ========================================
// HERO BACKGROUND
// ========================================
// The photographs behind the homepage heading.
//
// The club's published gallery photographs rotate slowly here, one fading into
// the next. With a single photograph it simply stays still, so the banner never
// flashes between two pictures for no reason.
//
// CSS background images are used on purpose: the banner has to cover the whole
// width of the screen, and a background is the one thing that does that without
// extra layout work.
// ========================================

import { useEffect, useState } from 'react';

export function HeroBackdrop({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (urls.length < 2) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % urls.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [urls.length]);

  return (
    <div aria-hidden="true" className="absolute inset-0">
      {urls.map((url, position) => (
        <div
          key={url}
          className="absolute inset-0 cursor-zoom-in bg-cover bg-center transition-opacity duration-1000 ease-in-out"
          data-photo-full={url}
          data-photo-alt=""
          style={{
            backgroundImage: `url("${url}")`,
            opacity: position === index ? 1 : 0,
            // Only the photograph on screen can be clicked.
            pointerEvents: position === index ? 'auto' : 'none',
          }}
        />
      ))}
    </div>
  );
}
