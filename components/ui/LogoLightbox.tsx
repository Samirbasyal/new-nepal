// ========================================
// CLICK THE LOGO TO SEE IT PROPERLY
// ========================================
// In the header the emblem is 40 pixels wide - enough to recognise, not enough
// to read "समानता | एकता | संस्कृति" or the address on the ribbon. Clicking it now
// opens the artwork at full size, with zoom, instead of doing nothing useful.
//
// The click does NOT navigate home any more. The club's name beside the emblem
// is still a link, so "go to the home page" is one click away and does not fight
// with "let me look at the logo".
//
// CONTROLS
//   buttons: zoom in, zoom out, fit, actual size, close
//   wheel over the picture: zoom
//   drag: move around when zoomed in
//   keyboard: + / - zoom, 0 fit, arrow keys pan, Esc close
//   double click: toggle between fit and 2x
// ========================================

'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

export function LogoLightbox({
  src,
  alt,
  children,
  label = 'View the club logo',
}: {
  src: string;
  alt: string;
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const zoomBy = useCallback((delta: number) => {
    setZoom((current) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2))));
      // Back at fit: there is nothing left to pan to.
      if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // ---------- keyboard, while it is open ----------
  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') return close();
      if (event.key === '+' || event.key === '=') return zoomBy(0.5);
      if (event.key === '-' || event.key === '_') return zoomBy(-0.5);
      if (event.key === '0') return reset();
      if (event.key === 'ArrowLeft') return setOffset((o) => ({ ...o, x: o.x - 40 }));
      if (event.key === 'ArrowRight') return setOffset((o) => ({ ...o, x: o.x + 40 }));
      if (event.key === 'ArrowUp') return setOffset((o) => ({ ...o, y: o.y - 40 }));
      if (event.key === 'ArrowDown') return setOffset((o) => ({ ...o, y: o.y + 40 }));
    }

    window.addEventListener('keydown', onKey);

    // Nothing behind the picture should scroll while it is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close, reset, zoomBy]);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // The logo usually sits inside a link to the home page. Opening the
          // picture must win over that, otherwise the click is just a page load.
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={label}
        title={label}
        className="cursor-zoom-in rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        {children}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="logo-viewer fixed inset-0 z-[100] flex flex-col bg-[#0b0f0c]/95 backdrop-blur-sm"
          onMouseDown={(event) => {
            // A click on the dark area closes; a click on the picture does not.
            if (event.target === event.currentTarget) close();
          }}
        >
          <style>{`
            .logo-viewer .logo-stage { animation: logo-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both; }
            @keyframes logo-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
            @media (prefers-reduced-motion: reduce) { .logo-viewer .logo-stage { animation: none; } }
          `}</style>

          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
            <p className="text-sm font-semibold sm:text-base">{alt}</p>

            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close the logo viewer"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-3"
            onWheel={(event) => {
              event.preventDefault();
              zoomBy(event.deltaY < 0 ? 0.25 : -0.25);
            }}
            onPointerDown={(event) => {
              if (zoom === MIN_ZOOM) return;
              dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag) return;
              setOffset({ x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) });
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- one local file, no need for an optimiser */}
            <img
              src={src}
              alt={alt}
              draggable={false}
              onDoubleClick={() => {
                if (zoom === MIN_ZOOM) setZoom(2);
                else reset();
              }}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: dragRef.current ? 'none' : 'transform 160ms ease-out',
                cursor: zoom === MIN_ZOOM ? 'zoom-in' : 'grab',
                touchAction: 'none',
              }}
              className="logo-stage max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl select-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-4 sm:gap-3">
            <ViewerButton onClick={() => zoomBy(-0.5)} disabled={zoom <= MIN_ZOOM} label="Zoom out">
              <Icon name="zoom-out" className="h-4 w-4" />
            </ViewerButton>

            <span className="min-w-14 text-center text-sm font-semibold tabular-nums text-white">
              {Math.round(zoom * 100)}%
            </span>

            <ViewerButton onClick={() => zoomBy(0.5)} disabled={zoom >= MAX_ZOOM} label="Zoom in">
              <Icon name="zoom-in" className="h-4 w-4" />
            </ViewerButton>

            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Fit
            </button>

            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Open full size
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ViewerButton({
  children,
  onClick,
  label,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {children}
    </button>
  );
}
