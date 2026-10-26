// ========================================
// ORGANIZATION LOGO
// Change the logo path from here.
// ========================================
// This component is the ONLY place that draws the organization logo, so the
// same logo file is used in the navbar, footer, login pages, member panel and
// admin panel.
//
// TO REPLACE THE LOGO:
//   1. Put your logo file into the folder:  public/branding/
//      (for example logo.png)
//   2. Open  config/site.ts  and change the line:
//          src: '/branding/logo.svg'
//      to   src: '/branding/logo.png'
//   3. Done. Every page now shows your logo.
//
// The placeholder logo mark that ships with the project is a simple SVG shape
// (not any real organization's logo) and can be deleted once you add your own.
// ========================================

import Link from 'next/link';
import { T } from '@/components/ui/T';
import { logo as logoConfig, organization } from '@/config/site';
import { cn } from '@/lib/utils';

// ========================================
// SMALL LOGO MARK (used in compact places)
// ========================================
export function LogoMark({
  size = 40,
  onDark = false,
  className,
}: {
  size?: number;
  /** Use the light version for dark backgrounds (footer, hero, login pages). */
  onDark?: boolean;
  className?: string;
}) {
  const src = onDark && logoConfig.srcOnDark ? logoConfig.srcOnDark : logoConfig.src;

  return (
    /* eslint-disable-next-line @next/next/no-img-element --
       One small file used everywhere; a picture element would not add anything. */
    <img
      src={src}
      alt={logoConfig.alt}
      width={size}
      height={size}
      // The artwork is a circular emblem on a white sheet. Rounding the frame
      // turns the sheet into a clean white disc, so the same file looks right on
      // the white navbar and on the dark green footer without a second version.
      className={cn('shrink-0 rounded-full bg-white object-cover', className)}
      // Makes the logo load immediately instead of lazily.
      loading="eager"
      decoding="async"
    />
  );
}

// ========================================
// FULL LOGO (MARK + ORGANIZATION NAME)
// ========================================
export function Logo({
  onDark = false,
  size = 40,
  showName = true,
  className,
  href = '/',
}: {
  onDark?: boolean;
  size?: number;
  showName?: boolean;
  className?: string;
  /** Where the logo links to when clicked. Use href="" to disable the link. */
  href?: string;
}) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} onDark={onDark} />
      {showName ? (
        <span className="flex flex-col leading-tight">
          <span
            className={cn(
              'font-display text-sm font-bold sm:text-base',
              onDark ? 'text-white' : 'text-ink-900',
            )}
          >
            {organization.name}
          </span>
          <span
            className={cn(
              'text-[10px] font-medium uppercase tracking-wider',
              onDark ? 'text-brand-100' : 'text-brand-600',
            )}
          >
            <T text="Community Youth Organization" />
          </span>
        </span>
      ) : null}
    </span>
  );

  // The logo is interactive: allow clicking it to go home.
  if (!href) return content;

  return (
    <Link
      href={href}
      className="rounded-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      aria-label={`${organization.name} - go to home page`}
    >
      {content}
    </Link>
  );
}
