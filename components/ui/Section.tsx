// ========================================
// LAYOUT BUILDING BLOCKS
// ========================================
// Small helpers used by every page so spacing and headings stay consistent.
//
//   <Section>            -> vertical spacing between page sections
//   <Container>          -> keeps content at a readable width
//   <SectionHeading>     -> the small coloured label + big title + description
//   <PageHero>           -> the coloured banner at the top of inner pages
// ========================================

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';

// ========================================
// CONTAINER
// ========================================
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('container-page', className)}>{children}</div>;
}

// ========================================
// SECTION
// ========================================
export function Section({
  children,
  className,
  id,
  tight = false,
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Use less vertical space (for secondary blocks). */
  tight?: boolean;
  /** Light grey background instead of white. */
  muted?: boolean;
}) {
  return (
    <section id={id} className={cn(tight ? 'section-tight' : 'section', muted && 'bg-ink-50', className)}>
      <Container>{children}</Container>
    </section>
  );
}

// ========================================
// SECTION HEADING
// ========================================
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  icon,
}: {
  /** Small label above the title, e.g. "Our Programs". */
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  icon?: IconName;
}) {
  return (
    <div
      className={cn(
        'mb-8 sm:mb-10',
        align === 'center' && 'mx-auto max-w-3xl text-center',
        className,
      )}
    >
      {eyebrow ? (
        <p className={cn('eyebrow mb-2', align === 'center' && 'justify-center')}>
          {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
          {eyebrow}
        </p>
      ) : null}

      {/* One <h2> per section keeps the heading order correct for accessibility. */}
      <h2 className="font-display text-2xl font-bold leading-tight text-ink-900 sm:text-3xl lg:text-4xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-3 text-base leading-relaxed text-ink-600 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

// ========================================
// PAGE HERO (banner at the top of inner pages)
// ========================================
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  icon?: IconName;
}) {
  return (
    <header className="relative overflow-hidden bg-brand-800 text-white">
      {/* Decorative background pattern (purely visual, hidden from screen readers) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25) 0, transparent 40%)',
        }}
      />
      <Container className="relative py-12 sm:py-16 lg:py-20">
        {eyebrow ? (
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-100">
            {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
            {eyebrow}
          </p>
        ) : null}

        {/* Every page has exactly one <h1> - good for SEO and screen readers. */}
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-brand-50 sm:text-lg">
            {description}
          </p>
        ) : null}

        {children ? <div className="mt-6">{children}</div> : null}
      </Container>
    </header>
  );
}

// ========================================
// SIMPLE RESPONSIVE GRID
// ========================================
export function CardGrid({
  children,
  columns = 3,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const columnClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return <div className={cn('grid grid-cols-1 gap-6', columnClass, className)}>{children}</div>;
}
