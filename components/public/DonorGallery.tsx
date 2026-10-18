// ========================================
// PUBLIC - DONORS & SUPPORTERS GALLERY
// ========================================
// THE CARD SHOWS TWO THINGS, AND ONLY TWO
//   the photo and the name. Address, occupation, purpose and description are in
//   the DOM only inside the detail panel, which is opened by a click - so a
//   visitor scanning the page never reads them by accident.
//
// WHY IT IS COMPACT
//   A supporters wall is read by scrolling past faces, not by reading cards. The
//   grid therefore fits 2 across on a phone and up to 6 across on a desktop, with
//   one fixed portrait shape so the rows stay even.
//
// ACCESSIBILITY
//   Every card is a real <button>, so it can be reached with Tab and opened with
//   Enter or Space. The panel closes with Escape, with the close button, or by
//   clicking the dark area around it, and focus returns to the card that opened
//   it.
// ========================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/** Exactly what the server sends to the browser - nothing more. */
export type PublicDonor = {
  id: string;
  name: string;
  photoUrl: string | null;
  address: string | null;
  occupation: string | null;
  purpose: string | null;
  description: string | null;
};

export function DonorGallery({ donors }: { donors: PublicDonor[] }) {
  const [active, setActive] = useState<PublicDonor | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lastCard = useRef<HTMLButtonElement | null>(null);

  const close = () => {
    setActive(null);
    // Put the keyboard back where it was, so the page does not jump.
    lastCard.current?.focus();
  };

  // ---------- Escape, and no scrolling behind the panel ----------
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the close button so a keyboard or screen-reader user lands inside.
    closeButton.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  return (
    <>
      {/* ========================================
          THE GRID
          ======================================== */}
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {donors.map((donor) => (
          <li key={donor.id}>
            <button
              type="button"
              onClick={(event) => {
                lastCard.current = event.currentTarget;
                setActive(donor);
              }}
              aria-label={`${donor.name} - see details`}
              className="group block w-full text-left focus:outline-none"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-ink-200 bg-ink-100 shadow-sm transition group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-brand-500 group-focus-visible:ring-offset-2">
                {donor.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={donor.photoUrl}
                    alt={donor.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                  />
                ) : (
                  <Initials name={donor.name} />
                )}

                {/* Name only. No address, no purpose, no amount. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-2 pt-8">
                  <p className="truncate text-[13px] font-semibold leading-tight text-white">
                    {donor.name}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* ========================================
          THE DETAIL PANEL
          ======================================== */}
      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="donor-detail-name"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={(event) => {
            // Only a click on the dark area closes it, not a click inside the card.
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <button
              ref={closeButton}
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow ring-1 ring-ink-200 transition hover:bg-white hover:text-ink-900"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              {/* ---------- photo ---------- */}
              <div className="relative aspect-[3/4] max-h-[42dvh] w-full overflow-hidden bg-ink-100 sm:max-h-none sm:rounded-l-2xl">
                {active.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.photoUrl}
                    alt={active.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Initials name={active.name} large />
                )}
              </div>

              {/* ---------- details, only now ---------- */}
              <div className="p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
                  Our donor &amp; supporter
                </p>
                <h3 id="donor-detail-name" className="mt-1 font-display text-2xl font-bold text-ink-900">
                  {active.name}
                </h3>

                <dl className="mt-4 space-y-3 text-sm">
                  {active.address ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        Address
                      </dt>
                      <dd className="mt-0.5 text-ink-800">{active.address}</dd>
                    </div>
                  ) : null}

                  {/* Occupation is genuinely optional: an empty one is left out
                      entirely rather than printed as a dash. */}
                  {active.occupation ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        Occupation
                      </dt>
                      <dd className="mt-0.5 text-ink-800">{active.occupation}</dd>
                    </div>
                  ) : null}

                  {active.purpose ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        Donation purpose
                      </dt>
                      <dd className="mt-0.5 text-ink-800">{active.purpose}</dd>
                    </div>
                  ) : null}
                </dl>

                {active.description ? (
                  <div className="mt-4 rounded-card bg-ink-50 p-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                      {active.description}
                    </p>
                  </div>
                ) : null}

                <p className="mt-4 text-[11px] leading-relaxed text-ink-400">
                  Published with this supporter&apos;s permission.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ========================================
// PLACEHOLDER FOR A DONOR WITH NO PHOTO
// ========================================
// A quiet monogram in the club's own colours - never a broken image icon.
function Initials({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600">
      <span
        className={
          large
            ? 'font-display text-6xl font-bold text-white/90'
            : 'font-display text-2xl font-bold text-white/90'
        }
      >
        {initials || '?'}
      </span>
    </div>
  );
}
