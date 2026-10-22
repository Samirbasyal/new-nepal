// ========================================
// AUTH FRAME - ONE LOOK FOR EVERY SIGN-IN / SIGN-UP PAGE
// ========================================
// Member portal, administrator sign-in and every donor page use this frame, so
// they look like one website:
//
//   [ dark green bar: logo + club name + tagline    |  home  Back to website ]
//   [ mountain hero: club name, promise, three promises, Nepali line        ]
//   [                    white card that holds the form                     ]
//
// WHY A SHARED FRAME
//   The sign-up and sign-in screens used to be styled separately, and they drifted:
//   one had extra headings, another had side panels. Now there is one frame and
//   the pages only supply their form.
//
// THE BACKGROUND
//   Drawn with gradients and an inline mountain silhouette rather than a photo, so
//   the page never waits for a large image and never looks broken if a photograph
//   is missing from the gallery.
// ========================================

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { organization } from '@/config/site';

/** The three promises shown under the club name, as on the design. */
const PROMISES = [
  { icon: 'leaf' as const, line1: 'Youth', line2: 'Empowerment' },
  { icon: 'heart-handshake' as const, line1: 'Community', line2: 'Development' },
  { icon: 'star' as const, line1: 'Equal Rights', line2: '& Opportunities' },
];

export function AuthFrame({
  children,
  /** Which service this is ("Member area", "Administrator sign-in"...). */
  note = 'Member area',
  /** Wider card for long forms (the membership request). */
  width = 'md',
}: {
  children: ReactNode;
  note?: string;
  width?: 'md' | 'lg';
}) {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* ========================================
          THE GREEN BAR
          ======================================== */}
      <header className="bg-[#0b4a3a] text-white print:hidden">
        <div className="container-page flex h-[74px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size={38} />
            <span className="leading-tight">
              <span className="block text-[15px] font-bold sm:text-base">{organization.name}</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Community youth organization
              </span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/90 hover:text-white sm:text-sm"
          >
            <Icon name="home" className="h-5 w-5" />
            <span className="hidden sm:inline">Back to website</span>
          </Link>
        </div>
      </header>

      {/* ========================================
          THE MOUNTAIN HERO
          ======================================== */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#cfe9f7] via-[#e8f4fb] to-[#f7fbfd]">
        {/* hills + peaks, drawn once, behind everything */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 420"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] w-full"
          preserveAspectRatio="none"
        >
          <path d="M0 300 L220 150 L360 250 L520 120 L700 300 L860 180 L1040 300 L1200 200 L1440 320 L1440 420 L0 420 Z" fill="#a7cfe0" opacity="0.55" />
          <path d="M0 340 L180 230 L340 320 L520 210 L720 340 L900 240 L1080 340 L1260 260 L1440 360 L1440 420 L0 420 Z" fill="#6fae86" opacity="0.55" />
          <path d="M0 380 L240 300 L420 360 L640 290 L840 370 L1040 300 L1240 370 L1440 330 L1440 420 L0 420 Z" fill="#2f7d5b" opacity="0.7" />
        </svg>

        {/* soft light so the white words stay readable over the hills */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/25 to-transparent"
        />

        <div className="container-page relative z-10 pb-24 pt-8 sm:pb-28 sm:pt-10">
          <div className="max-w-xl">
            <p className="text-3xl font-extrabold leading-[1.12] tracking-tight text-[#0b3b2e] sm:text-4xl">
              Janakalyan
              <br />
              Samataa Yuwa Club
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#1d4a3d]/85 sm:text-base">
              Together for a fair, just and prosperous community.
            </p>

            <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              {PROMISES.map((item) => (
                <li key={item.line1} className="flex items-center gap-2">
                  <Icon name={item.icon} className="h-4 w-4 text-[#1f7a52]" />
                  <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-[#1d4a3d]/85">
                    {item.line1}
                    <br />
                    {item.line2}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* the Nepali line, tilted like a stamp */}
          <p className="absolute right-4 top-10 hidden rotate-[-6deg] rounded-md bg-white/70 px-3 py-1 text-sm font-bold leading-snug text-[#0b3b2e] shadow-sm ring-1 ring-[#0b3b2e]/10 sm:block">
            समानता, न्याय र
            <br />
            रोजगारी अभियान
          </p>
        </div>
      </section>

      {/* ========================================
          THE CARD
          ======================================== */}
      <div className="relative z-20 -mt-16 px-4 pb-14">
        <div
          className={
            width === 'lg'
              ? 'mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-[0_18px_50px_-20px_rgba(11,59,46,0.35)] ring-1 ring-black/5 sm:p-8'
              : 'mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_18px_50px_-20px_rgba(11,59,46,0.35)] ring-1 ring-black/5 sm:p-7'
          }
        >
          {children}
        </div>

        <p className="mx-auto mt-5 flex max-w-md items-center justify-center gap-1.5 text-center text-[11px] text-ink-500">
          <Icon name="lock" className="h-3.5 w-3.5" />
          Your information is safe and secure
        </p>
        <p className="mt-1 text-center text-[11px] text-ink-400">{note}</p>
      </div>
    </main>
  );
}
