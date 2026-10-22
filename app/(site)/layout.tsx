// ========================================
// PUBLIC WEBSITE LAYOUT
// ========================================
// Everything inside the folder "app/(site)/" is part of the PUBLIC website.
//
// The brackets around "(site)" are a Next.js "route group": they keep the
// code organised in folders WITHOUT adding "/site" to the web address.
// So app/(site)/about/page.tsx is simply  /about
//
// This layout adds the elements that every public page shares:
//   - the language, so any card or label can translate itself
//   - the NAVBAR at the top
//   - the FOOTER at the bottom
//
// The member panel (app/member/) and the admin panel (app/admin/) have their
// own layouts, so they never show this public menu.
// ========================================

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { LangProvider } from '@/components/ui/LangProvider';
import { PhotoZoom } from '@/components/public/PhotoZoom';
import { getLanguage } from '@/lib/i18n-server';

// Public pages read live data from the database, so the pages inside this
// layout are rendered freshly on every visit instead of being frozen at
// build time. This also means the website builds successfully even before a
// database has been connected.
export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // The one language setting for the whole website. It is read on the server,
  // so the first paint already has the right words and there is no flash of
  // English before Nepali appears.
  const lang = await getLanguage();

  return (
    <LangProvider lang={lang}>
      {/*
        Accessibility: a keyboard-only visitor can press TAB once and jump
        straight to the page content, skipping the menu.
      */}
      <a href="#main-content" className="skip-link">
        {lang === 'ne' ? 'मुख्य सामग्रीमा जानुहोस्' : 'Skip to main content'}
      </a>

      <Navbar />

      {/* The id="main-content" below is the target of the skip link above. */}
      <main id="main-content" className="flex-1">
        {children}
      </main>

      <Footer />

      {/* Opens any picture marked data-photo-full at full size. */}
      <PhotoZoom />
    </LangProvider>
  );
}
