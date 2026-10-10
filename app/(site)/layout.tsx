// ========================================
// PUBLIC WEBSITE LAYOUT
// ========================================
// Everything inside the folder "app/(site)/" is part of the PUBLIC website.
//
// The brackets around "(site)" are a Next.js "route group": they keep the
// code organised in folders WITHOUT adding "/site" to the web address.
// So app/(site)/about/page.tsx is simply  /about
//
// This layout adds the two elements that every public page shares:
//   - the NAVBAR at the top
//   - the FOOTER at the bottom
//
// The member panel (app/member/) and the admin panel (app/admin/) have their
// own layouts, so they never show this public menu.
// ========================================

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// Public pages read live data from the database, so the pages inside this
// layout are rendered freshly on every visit instead of being frozen at
// build time. This also means the website builds successfully even before a
// database has been connected.
export const dynamic = 'force-dynamic';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Accessibility: a keyboard-only visitor can press TAB once and jump
        straight to the page content, skipping the menu.
      */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Navbar />

      {/* The id="main-content" below is the target of the skip link above. */}
      <main id="main-content" className="flex-1">
        {children}
      </main>

      <Footer />
    </>
  );
}
