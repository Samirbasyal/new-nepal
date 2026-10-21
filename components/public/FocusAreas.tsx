// ========================================
// HOMEPAGE - WHAT WE WORK FOR
// ========================================
// Four cards, one for each focus area, sitting straight under the banner the way
// the approved design shows them: soft tinted panels, a round icon at the top,
// a short heading and two lines of explanation.
//
// WHERE THE WORDS COME FROM
//   Admin Panel -> Content sections -> group "Homepage - What We Work For"
//   (one row per card: title, subtitle, body; sortOrder decides the order).
//
//   If the club has not written them yet, the four lines agreed for the website
//   are used, so the band is never empty. They are still ordinary content - not
//   numbers, claims or achievements.
//
// The icons are fixed to the position, because an icon is a design decision, not
// a sentence: card 1 is always the people mark, card 2 the heart, and so on.
// ========================================

import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';

type FocusRow = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
};

type Card = {
  icon: IconName;
  title: string;
  text: string;
  /** Panel tint, icon colour and icon ring, one set per position. */
  tint: string;
  ink: string;
};

const DEFAULT_CARDS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'users',
    title: 'Community Support',
    text: 'Our work brings positive change in the community.',
  },
  {
    icon: 'heart',
    title: 'Social Equality',
    text: 'Support for the rights and dignity of the Dalit community.',
  },
  {
    icon: 'book',
    title: 'Education & Awareness',
    text: 'Education and awareness builds a better future.',
  },
  {
    icon: 'leaf',
    title: 'Women Empowerment',
    text: 'Support and protection for women affected by violence.',
  },
];

// The four tints, in order.
const TINTS = [
  { tint: 'bg-[#eef4ff] border-[#dbe7fb]', ink: 'text-[#2563eb]' },
  { tint: 'bg-[#fff1f2] border-[#fbdfe2]', ink: 'text-[#e11d48]' },
  { tint: 'bg-[#eef4ff] border-[#dbe7fb]', ink: 'text-[#2563eb]' },
  { tint: 'bg-[#eefaf1] border-[#d6f0de]', ink: 'text-[#16a34a]' },
];

export function FocusAreas({ rows }: { rows: FocusRow[] }) {
  // Written content wins; the agreed wording fills the gaps.
  const cards: Card[] = DEFAULT_CARDS.map((fallback, index) => {
    const row = rows[index];

    return {
      icon: fallback.icon,
      title: row?.title || fallback.title,
      text: row?.subtitle || row?.body || fallback.text,
      ...TINTS[index],
    };
  });

  return (
    <section className="bg-white py-10 sm:py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <li
              key={card.title}
              className={`flex h-full flex-col items-center rounded-xl border p-6 text-center transition hover:shadow-sm ${card.tint}`}
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/70 ${card.ink}`}>
                <Icon name={card.icon} className="h-5 w-5" />
              </span>

              <h3 className="mt-4 text-sm font-bold text-ink-900">
                <T text={card.title} />
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-600">
                <T text={card.text} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
