// ========================================
// ADMIN PANEL - RECEIPT VIEWER
// ========================================
// Opens a payment receipt so an administrator can actually READ it before
// approving the money.
//
// WHY IT IS NOT JUST A LINK
//   An approval moves real money into the organization's totals. A receipt
//   photographed on a phone is often small, blurry or taken at an angle, so the
//   administrator needs to zoom in on the amount, the date and the transaction
//   ID. A plain link opens a tab at an unhelpful size.
//
// WHAT IT DOES
//   - Opens the picture in a panel over the page (no full page reload, so the
//     administrator does not lose their place in the approval queue).
//   - Zoom out / zoom in / reset, plus "open the original" for the full file.
//   - Closes with the Escape key, the Close button, or by clicking the backdrop.
//   - Locks background scrolling while it is open, so the queue behind it does
//     not slide around.
//
// ACCESSIBILITY
//   A proper dialog role with a label, and every control reachable by keyboard.
// ========================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export function ReceiptViewer({
  url,
  label,
  className,
}: {
  url: string;
  /** Describes whose receipt this is, for screen readers and the heading. */
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
    setFailed(false);
  }, []);

  // Escape closes it; and while it is open the page behind must not scroll.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('btn btn-outline btn-sm', className)}
        aria-haspopup="dialog"
      >
        <Icon name="image" className="h-4 w-4" />
        View receipt
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Payment receipt for ${label}`}
          className="fixed inset-0 z-50 flex flex-col bg-ink-900/80 p-3 sm:p-6"
          onClick={close}
        >
          {/* ---------- Toolbar ---------- */}
          <div
            className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 rounded-t-xl bg-white px-4 py-3"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mr-auto min-w-0 truncate text-sm font-semibold text-ink-900">
              Receipt · {label}
            </p>

            {/* Plain minus/plus characters rather than icons: they are always
                rendered correctly and are unmistakable at a glance. */}
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))}
              className="btn btn-outline btn-sm font-bold"
              aria-label="Zoom out"
              title="Zoom out"
            >
              −
            </button>

            <span className="min-w-14 text-center text-xs font-semibold tabular-nums text-ink-700">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))}
              className="btn btn-outline btn-sm font-bold"
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => setZoom(1)}
              className="btn btn-ghost btn-sm"
              aria-label="Reset zoom"
            >
              Reset
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
            >
              <Icon name="external-link" className="h-4 w-4" />
              Original
            </a>

            <button type="button" onClick={close} className="btn btn-ghost btn-sm" aria-label="Close">
              <Icon name="close" className="h-4 w-4" />
              Close
            </button>
          </div>

          {/* ---------- The picture ---------- */}
          <div
            className="mx-auto flex w-full max-w-4xl flex-1 items-start justify-center overflow-auto rounded-b-xl bg-ink-100 p-3"
            onClick={(event) => event.stopPropagation()}
          >
            {failed ? (
              <div className="p-8 text-center text-sm text-ink-700">
                <p className="font-semibold">This receipt could not be displayed here.</p>
                <p className="mt-1">
                  It may have been removed, or the link may be wrong. Use &ldquo;Original&rdquo; above
                  to try opening it directly.
                </p>
              </div>
            ) : (
              /* A plain <img> on purpose: the receipts live on an external store
                 (Vercel Blob) and their exact size is unknown, so the plain tag
                 avoids Next.js image-optimisation rules for remote hosts. */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={`Payment receipt for ${label}`}
                onError={() => setFailed(true)}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                className="max-w-full rounded-lg bg-white shadow-lg transition-transform duration-150"
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
