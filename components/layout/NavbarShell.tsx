// ========================================
// NAVBAR (RESPONSIVE MAIN MENU)
// ========================================
// This code controls the top navigation bar, including the mobile menu.
//
// This file is a "client component" (the first line says "use client")
// because it needs to react to clicks: opening the mobile menu, opening the
// "More" drop-down and highlighting the page you are currently on.
//
// The links themselves come from config/site.ts -> navigation
// ========================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/layout/Logo';
import { Icon } from '@/components/ui/Icon';
import { useLang } from '@/components/ui/LangProvider';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { cn } from '@/lib/utils';

export type NavLink = { label: string; href: string };
export type NavAction = { label: string; href: string; style: 'accent' | 'outline' };
export type NavUser = { name: string; role: 'ADMIN' | 'MEMBER' } | null;

export function NavbarShell({
  primary,
  more,
  actions,
  extras,
  user,
}: {
  primary: NavLink[];
  more: NavLink[];
  actions: NavAction[];
  extras: NavLink[];
  user: NavUser;
}) {
  // Menu words arrive in English and are translated here.
  const { lang, tr } = useLang();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // moreRef is attached to the <li> that holds the "More" drop-down.
  const moreRef = useRef<HTMLLIElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close the menus every time the visitor navigates to another page.
  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // Add a shadow to the navbar once the page is scrolled down.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drop-down menus when clicking anywhere outside them.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreRef.current && !moreRef.current.contains(target)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // "Escape" closes the mobile menu (keyboard accessibility).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setMoreOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /** Is this link the page we are currently looking at? */
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    cn(
      'relative rounded-btn px-3 py-2 text-sm font-medium transition-colors',
      isActive(href) ? 'text-brand-700' : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
    );

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur transition-shadow',
        scrolled ? 'border-ink-200 shadow-sm' : 'border-transparent',
      )}
    >
      {/* Thin accent line above the navbar */}
      <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-accent-400 via-accent-500 to-brand-600" />

      <nav className="container-page flex h-16 items-center justify-between gap-3" aria-label="Main menu">
        {/* ---------- LOGO ---------- */}
        <Logo size={38} />

        {/* ---------- DESKTOP LINKS ---------- */}
        <ul className="hidden items-center gap-0.5 lg:flex">
          {primary.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={linkClass(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
                {tr(item.label)}
              </Link>
            </li>
          ))}

          {/* "More" drop-down for the remaining links */}
          {more.length > 0 ? (
            <li className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                className={cn(
                  'inline-flex items-center gap-1 rounded-btn px-3 py-2 text-sm font-medium transition-colors',
                  more.some((item) => isActive(item.href))
                    ? 'text-brand-700'
                    : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
                )}
              >
                {tr('More')}
                <Icon
                  name="chevron-down"
                  className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')}
                />
              </button>

              {moreOpen ? (
                <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-card border border-ink-200 bg-white p-1.5 shadow-card-hover animate-fade-in">
                  {more.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'block rounded-btn px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-ink-700 hover:bg-ink-100',
                      )}
                    >
                      {tr(item.label)}
                    </Link>
                  ))}
                </div>
              ) : null}
            </li>
          ) : null}
        </ul>

        {/* ---------- RIGHT SIDE ACTIONS ---------- */}
        <div className="hidden items-center gap-2 lg:flex">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn('btn', action.style === 'accent' ? 'btn-accent' : 'btn-outline')}
            >
              {tr(action.label)}
            </Link>
          ))}

          {/* ----- Logged in: show the user menu ----- */}
          {user ? (
            <div className="relative" ref={userRef}>
              <button
                type="button"
                onClick={() => setUserOpen((open) => !open)}
                aria-expanded={userOpen}
                aria-haspopup="true"
                className="inline-flex items-center gap-2 rounded-btn border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-800 hover:border-brand-500 hover:text-brand-700"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[8rem] truncate">{user.name}</span>
                <Icon name="chevron-down" className={cn('h-4 w-4 transition-transform', userOpen && 'rotate-180')} />
              </button>

              {userOpen ? (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-card border border-ink-200 bg-white p-1.5 shadow-card-hover animate-fade-in">
                  <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                    Signed in as {user.role === 'ADMIN' ? 'Administrator' : 'Member'}
                  </p>

                  <Link
                    href="/member/dashboard"
                    className="block rounded-btn px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
                  >
                    Member Dashboard
                  </Link>

                  {/* NOTE: there is deliberately NO public "Admin" link here.
                      Administrators reach the panel at its private address (lib/auth/admin-entry.ts)
                      directly, which keeps the public website clean. */}

                  <div className="my-1 border-t border-ink-100" />
                  <LogoutButton className="w-full justify-start rounded-btn px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50" />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ---------- MOBILE MENU BUTTON ---------- */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-btn border border-ink-300 text-ink-800 lg:hidden"
        >
          <Icon name={mobileOpen ? 'close' : 'menu'} className="h-5 w-5" />
        </button>
      </nav>

      {/* ---------- MOBILE MENU PANEL ---------- */}
      {mobileOpen ? (
        <div id="mobile-menu" className="border-t border-ink-200 bg-white lg:hidden">
          <div className="container-page max-h-[calc(100vh-5rem)] overflow-y-auto py-4">
            <ul className="grid grid-cols-2 gap-1">
              {[...primary, ...more].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'block rounded-btn px-3 py-2.5 text-sm font-medium',
                      isActive(item.href) ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-100',
                    )}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    {tr(item.label)}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2">
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    'btn w-full',
                    action.style === 'accent' ? 'btn-accent' : 'btn-outline',
                  )}
                >
                  {tr(action.label)}
                </Link>
              ))}
            </div>

            <div className="mt-4 rounded-card bg-ink-50 p-3">
              {user ? (
                <div className="space-y-1">
                  <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {user.name} ({user.role === 'ADMIN' ? 'Administrator' : 'Member'})
                  </p>
                  <Link
                    href="/member/dashboard"
                    className="block rounded-btn px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white"
                  >
                    Member Dashboard
                  </Link>
                  <LogoutButton className="w-full justify-start rounded-btn px-3 py-2 text-sm font-medium text-red-600 hover:bg-white" />
                </div>
              ) : (
                <ul className="space-y-1">
                  {extras.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block rounded-btn px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white"
                      >
                        {tr(item.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
