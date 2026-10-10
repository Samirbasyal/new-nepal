// ========================================
// CONTENT SECTION RENDERER
// ========================================
// Long text blocks (About, Vision, Mission, Objectives, Women Empowered...)
// are stored in the database as "content sections" so they can be rewritten
// from Admin Panel -> Content sections without touching any code.
//
// This component turns one stored row into a nicely formatted block.
//
// HOW THE STORED TEXT IS READ
//   body        -> split on blank lines, so each paragraph gets its own <p>
//   bulletList  -> one item per line, rendered as a bullet list
//
// "**bold**" inside a paragraph is turned into real bold text, so
// administrators can emphasise a few words without knowing any HTML.
// ========================================

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { parseLines } from '@/lib/utils';

export type ContentSectionData = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  bulletList?: string | null;
  imageUrl?: string | null;
};

// ========================================
// TEXT HELPER
// ========================================
/**
 * Turn "**important**" into bold text.
 * Nothing else is interpreted - there is no HTML parsing here, which keeps
 * the website safe from accidentally pasted markup.
 */
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

/** Split the stored body into paragraphs. */
function toParagraphs(body?: string | null): string[] {
  if (!body) return [];
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

// ========================================
// ONE CONTENT SECTION
// ========================================
export function ContentSectionView({
  section,
  /** Show the heading inside this component (false when the page already has one). */
  showHeading = true,
  /** Where the bullet list sits relative to the text. */
  layout = 'stacked',
}: {
  section: ContentSectionData;
  showHeading?: boolean;
  layout?: 'stacked' | 'two-column';
}) {
  const paragraphs = toParagraphs(section.body);
  const bullets = parseLines(section.bulletList);

  return (
    <article className="scroll-mt-24" id={section.slug}>
      {showHeading ? (
        <>
          <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">
            {section.title}
          </h2>
          {section.subtitle ? (
            <p className="mt-1 text-sm font-medium text-brand-700">{section.subtitle}</p>
          ) : null}
        </>
      ) : null}

      <div
        className={
          layout === 'two-column'
            ? 'mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2'
            : 'mt-4 space-y-6'
        }
      >
        {/* ---------- Paragraphs ---------- */}
        {paragraphs.length > 0 ? (
          <div className="prose-content space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{renderInline(paragraph)}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-ink-400">
            [Add this text in Admin Panel → Content sections]
          </p>
        )}

        {/* ---------- Bullet list ---------- */}
        {bullets.length > 0 ? (
          <ul className="space-y-2.5">
            {bullets.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

// ========================================
// A GRID OF CONTENT SECTIONS (used on the About page)
// ========================================
export function ContentSectionGrid({
  sections,
  columns = 2,
}: {
  sections: ContentSectionData[];
  columns?: 1 | 2 | 3;
}) {
  if (sections.length === 0) return null;

  const columnClass = {
    1: '',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <div className={`grid grid-cols-1 gap-6 ${columnClass}`}>
      {sections.map((section) => (
        <div key={section.id} className="card p-6">
          <h3 className="text-base font-bold text-ink-900">{section.title}</h3>
          {section.subtitle ? (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-brand-600">
              {section.subtitle}
            </p>
          ) : null}

          {toParagraphs(section.body).map((paragraph, index) => (
            <p key={index} className="mt-3 text-sm leading-relaxed text-ink-600">
              {renderInline(paragraph)}
            </p>
          ))}

          {parseLines(section.bulletList).length > 0 ? (
            <ul className="mt-3 space-y-2">
              {parseLines(section.bulletList).map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-ink-700">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
