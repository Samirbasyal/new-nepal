// ========================================
// PUBLIC WEBSITE
// This code controls ONE committee member card on /karya-samiti.
// ========================================
// WHAT IS SHOWN - AND WHAT IS NOT
//   Shown, as three separate fields: the person's own name, their post, and
//   their current address.
//   Never shown: phone, email, permanent address, date of birth, citizenship,
//   member number, joining dates and internal notes. Those columns are not even
//   loaded by the page (see lib/karya/queries.ts), so there is nothing to hide
//   here - the card simply has no access to them.
//
//   The name comes straight from the database. Nothing in this file renames,
//   shortens or invents a person: if the office typed "Ram Bahadur", that is
//   what appears.
//
// SIZE OF THE PHOTO
//   Passport style by default - a small, upright 3:4 thumbnail, the same size
//   for everyone, so the row lines up neatly.
//
//   The post that runs the organisation (अध्यक्ष / Chairperson) gets a slightly
//   larger frame - one step, not a poster. Every card is still the same height
//   because the photo sits inside a fixed-height area, so making one photo
//   bigger cannot push the other cards out of line.
//
// IF THERE IS NO PHOTO
//   A professional placeholder with the person's initials is shown instead. We
//   never borrow a stock photo of a stranger: that would misrepresent a real
//   committee member.
//
// CLICKING A PHOTO
//   Opens a moderate enlargement in a centred lightbox that shows only the
//   photo. Close with the X, by clicking the dark background, or with ESC.
// ========================================

'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { PublicCommitteeMember } from '@/lib/karya/queries';
import { cn } from '@/lib/utils';

/** First letters of up to two words, e.g. "राम बहादुर" -> "राब". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2);
  return `${words[0][0]}${words[1][0]}`;
}

/**
 * Is this the leading post of the committee?
 *
 * Checked from the POST, never from a person's name - the office can rename a
 * post freely and the layout still does the right thing.
 *
 * "उप" is tested first on purpose: उपाध्यक्ष (Vice Chairperson) contains the word
 * अध्यक्ष, and a vice chair must not be given the chair's bigger photo.
 */
function isLeadingPost(postTitle: string): boolean {
  const title = postTitle.trim().toLowerCase();
  if (!title) return false;
  if (title.includes('उप') || title.includes('vice') || title.includes('deputy')) return false;

  return (
    title.includes('अध्यक्ष') ||
    title.includes('chairperson') ||
    title.includes('chair man') ||
    title.includes('chairman') ||
    title.includes('president')
  );
}

export function CommitteeMemberCard({ member }: { member: PublicCommitteeMember }) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const leading = isLeadingPost(member.postTitle);

  // ESC closes, and the page behind the lightbox must not scroll.
  useEffect(() => {
    if (!photoOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhotoOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [photoOpen]);

  const frameClass = leading ? 'w-28' : 'w-24';

  return (
    <article className="card flex h-full flex-col overflow-hidden p-4 text-center transition hover:shadow-card-hover sm:p-5">
      {/* ---------- Photo (or the initials placeholder) ----------
          h-40 keeps the photo area the same height on every card, so a slightly
          larger leading photo can never make one card taller than its row. */}
      <div className="flex h-40 items-center justify-center">
        {member.photoUrl ? (
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            className="group relative block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label={`View a larger photo of ${member.fullName}`}
          >
            <span
              className={cn(
                'block overflow-hidden rounded-lg bg-ink-100 ring-1 ring-ink-200',
                frameClass,
                leading ? 'ring-2 ring-brand-400' : '',
              )}
            >
              {/* aspect-[3/4] = passport proportions. object-cover crops rather
                  than stretching, so a face is never distorted. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.photoUrl}
                alt={`${member.fullName} - ${member.postTitle}`}
                className="aspect-[3/4] w-full object-cover"
                loading="lazy"
              />
            </span>

            {/* Small hint that the photo can be opened. */}
            <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-brand-600 p-1.5 text-white shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Icon name="search" className="h-3.5 w-3.5" />
            </span>
          </button>
        ) : (
          <div
            className={cn(
              'flex aspect-[3/4] items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-ink-100 ring-1 ring-ink-200',
              frameClass,
              leading ? 'ring-2 ring-brand-400' : '',
            )}
          >
            <span className="font-display text-2xl font-bold text-brand-600/70" aria-hidden="true">
              {initials(member.fullName)}
            </span>
            <span className="sr-only">Photo not added yet</span>
          </div>
        )}
      </div>

      {/* ---------- The three public fields, kept separate ---------- */}
      <div className="mt-4 flex flex-1 flex-col">
        {/* 1. Name - exactly as stored in the database */}
        <h3 className="font-display text-base font-bold leading-tight text-ink-900">
          {member.fullName}
        </h3>

        {/* 2. Post */}
        <p className="mt-2 inline-flex self-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          {member.postTitle}
        </p>

        {/* 3. Current address */}
        {member.currentAddress ? (
          <p className="mt-auto pt-3 text-sm leading-snug text-ink-600">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Current address
            </span>
            {member.currentAddress}
          </p>
        ) : null}
      </div>

      {/* ---------- The enlargement: only the photo ---------- */}
      {photoOpen && member.photoUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 animate-fade-in sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo of ${member.fullName}`}
          onClick={() => setPhotoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPhotoOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2.5 text-white ring-1 ring-white/20 hover:bg-black/75 sm:right-5 sm:top-5"
            aria-label="Close photo"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>

          {/* Moderate enlargement: capped at 60% of the screen height, so it is
              clearly bigger than the thumbnail but never a wall of face. It
              keeps the photo's own shape - no stretching, no odd cropping. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={member.photoUrl}
            alt={`${member.fullName} - ${member.postTitle}`}
            onClick={(event) => event.stopPropagation()}
            className="h-auto max-h-[60vh] w-auto max-w-[88vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </article>
  );
}
