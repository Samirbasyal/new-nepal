// ========================================
// HOMEPAGE - WHAT WE WORK FOR
// ========================================
// Four cards, one for each focus area.
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
// a sentence: card 1 is always the equality mark, card 2 the book, and so on.
// ========================================

import { Icon, type IconName } from '@/components/ui/Icon';
import { Section, SectionHeading } from '@/components/ui/Section';

type FocusRow = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
};

const DEFAULT_CARDS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'users',
    title: 'Equality & Dignity',
    text: 'Ensuring equal rights, dignity, and respect for every individual.',
  },
  {
    icon: 'book',
    title: 'Education & Opportunity',
    text: 'Supporting quality education, skills development, and opportunities for young people.',
  },
  {
    icon: 'heart-handshake',
    title: "Women's Empowerment",
    text: 'Creating opportunities for women to lead, participate, and grow.',
  },
  {
    icon: 'leaf',
    title: 'Health & Clean Communities',
    text: 'Promoting better health, sanitation, environmental awareness, and safer communities.',
  },
];

export function FocusAreas({ rows }: { rows: FocusRow[] }) {
  // Written content wins; the agreed wording fills the gaps.
  const cards = DEFAULT_CARDS.map((fallback, index) => {
    const row = rows[index];
    if (!row) return fallback;

    return {
      icon: fallback.icon,
      title: row.title || fallback.title,
      text: row.subtitle || row.body || fallback.text,
    };
  });

  return (
    <Section muted>
      <SectionHeading
        eyebrow="Our focus"
        icon="target"
        title="What We Work For"
        description="Our focus areas for a stronger, fairer and more inclusive community."
        align="center"
      />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.title} className="card group h-full p-6 transition hover:shadow-md">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
              <Icon name={card.icon} className="h-6 w-6" />
            </span>

            <h3 className="mt-4 text-base font-bold text-ink-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{card.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
