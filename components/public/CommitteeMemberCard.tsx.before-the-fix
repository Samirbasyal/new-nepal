// ========================================
// PUBLIC WEBSITE
// This code controls ONE committee member card on /karya-samiti.
// ========================================
// WHAT IS SHOWN - AND WHAT IS NOT
//   Shown: photo, full name, post and current address.
//   Never shown: phone, email, permanent address, date of birth, citizenship,
//   member number, joining dates and internal notes. Those columns are not even
//   loaded by the page (see lib/karya/queries.ts), so there is nothing to hide
//   here - the card simply has no access to them.
//
// IF THERE IS NO PHOTO
//   A professional placeholder with the person's initials is shown instead. We
//   never borrow a stock photo of a stranger: that would misrepresent a real
//   committee member.
// ========================================

import type { PublicCommitteeMember } from '@/lib/karya/queries';

/** First letters of up to two words, e.g. "राम बहादुर" -> "राब". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2);
  return `${words[0][0]}${words[1][0]}`;
}

export function CommitteeMemberCard({ member }: { member: PublicCommitteeMember }) {
  return (
    <article className="card overflow-hidden transition hover:shadow-card-hover">
      {/* ---------- Photo (or the initials placeholder) ---------- */}
      <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-brand-50 to-ink-100">
        {member.photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={member.photoUrl}
            alt={`${member.fullName} - ${member.postTitle}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span
              className="font-display text-4xl font-bold text-brand-600/70"
              aria-hidden="true"
            >
              {initials(member.fullName)}
            </span>
            <span className="sr-only">Photo not added yet</span>
          </div>
        )}
      </div>

      {/* ---------- Name, post, address ---------- */}
      <div className="p-4 text-center sm:p-5">
        <h3 className="font-display text-lg font-bold leading-tight text-ink-900">
          {member.fullName}
        </h3>

        <p className="mt-1 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          {member.postTitle}
        </p>

        {member.currentAddress ? (
          <p className="mt-3 text-sm text-ink-600">{member.currentAddress}</p>
        ) : null}
      </div>
    </article>
  );
}
