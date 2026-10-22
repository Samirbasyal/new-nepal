// ========================================
// DISPLAY
// ========================================
// Address: /display        (reached from  More -> Display)
//
// WHAT IS ON THIS PAGE
//   One word: "Welcome". And the "Member view" button in the bottom corner.
//   Nothing else - no lists, no explanation, no mention of membership.
//
// WHY IT IS THIS EMPTY
//   This page is deliberately quiet. It is the way into the member area, and the
//   less it says the better: a visitor who lands here sees a welcome, and only
//   somebody who was told about the corner button will use it.
//
//   The real form is NOT here. It is the server-checked form at /member/portal
//   (components/member/MembershipRequestForm.tsx), which the corner button opens.
//   One form, one place, one set of rules.
//
// NOT IN SEARCH ENGINES
//   metadata.robots below tells search engines not to list this page, and the
//   sitemap does not mention it either.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Welcome',
  // Keep this page out of search results: it is an entrance, not a destination.
  robots: { index: false, follow: false },
};

export default function DisplayPage() {
  // NOTE: a <div>, not <main> - the site layout already wraps every page in
  // <main id="main-content">, and two of them would be invalid HTML.
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        Welcome
      </h1>

      {/* ========================================
          THE CORNER BUTTON
          ======================================== */}
      {/*
        Pinned to the bottom-right corner: the member sign-in, shown as
        "Member view". Outside the normal flow so it is always reachable, and
        quiet enough that it does not advertise itself.
      */}
      <Link
        href="/member/portal"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5 transition-colors hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 print:hidden"
      >
        <Icon name="users" className="h-4 w-4" />
        Member view
      </Link>
    </div>
  );
}
