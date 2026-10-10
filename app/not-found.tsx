// ========================================
// 404 PAGE - PAGE NOT FOUND
// This code controls what a visitor sees when a page does not exist.
// ========================================
// It is deliberately self-contained (no database access) so it always renders
// instantly and never fails.
// ========================================

import Link from 'next/link';
import { LogoMark } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { organization } from '@/config/site';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

const SUGGESTED_LINKS = [
  { label: 'Home', href: '/', icon: 'home' as const },
  { label: 'About us', href: '/about', icon: 'users' as const },
  { label: 'Programs', href: '/programs', icon: 'layers' as const },
  { label: 'News', href: '/news', icon: 'megaphone' as const },
  { label: 'Gallery', href: '/gallery', icon: 'image' as const },
  { label: 'Contact', href: '/contact', icon: 'mail' as const },
];

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          aria-label={`${organization.name} - go to home page`}
        >
          <LogoMark size={40} />
          <span className="font-display text-sm font-bold text-ink-900">{organization.name}</span>
        </Link>

        <p className="mt-8 font-display text-6xl font-bold text-brand-600">404</p>

        <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">
          We could not find that page
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          The page may have been moved, renamed, or it may never have existed. Let us help you find
          your way back.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="primary">
            <Icon name="home" className="h-4 w-4" />
            Back to home
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline">
            <Icon name="mail" className="h-4 w-4" />
            Contact us
          </ButtonLink>
        </div>

        <nav className="mt-10 border-t border-ink-200 pt-6" aria-label="Suggested pages">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {SUGGESTED_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-700"
                >
                  <Icon name={item.icon} className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
