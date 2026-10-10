// ========================================
// ROOT LAYOUT (WRAPS THE WHOLE WEBSITE)
// ========================================
// This file surrounds EVERY page: the public website, the member panel and
// the admin panel.
//
// IT CONTROLS
//   - the <html> and <body> tags
//   - the fonts loaded from Google Fonts
//   - the browser tab title and search engine information (SEO)
//   - the favicon
//
// The visible navbar and footer are added by app/(site)/layout.tsx, because
// the member and admin panels have their own layouts and must NOT show the
// public menu.
// ========================================

import type { Metadata, Viewport } from 'next';
import { logo, organization, seo } from '@/config/site';
import './globals.css';

// ========================================
// SEO - PAGE TITLES AND PREVIEW CARDS
// ========================================
// These values appear in Google results and when a link is shared on
// Facebook, WhatsApp or Viber.
// ========================================
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  // Base address used to build absolute links for social previews.
  metadataBase: new URL(siteUrl),

  title: {
    default: `${organization.name} - ${organization.tagline}`,
    template: seo.titleTemplate,
  },
  description: organization.description,
  keywords: seo.keywords,

  // The organization name shown by search engines and social platforms.
  applicationName: organization.name,
  authors: [{ name: organization.name }],
  creator: organization.name,
  publisher: organization.name,

  // ---------- Browser tab icon ----------
  icons: {
    icon: logo.favicon,
    shortcut: logo.favicon,
    apple: logo.favicon,
  },

  // ---------- Open Graph (Facebook, WhatsApp, Viber previews) ----------
  openGraph: {
    type: 'website',
    siteName: organization.name,
    title: `${organization.name} - ${organization.tagline}`,
    description: organization.description,
    url: siteUrl,
    locale: 'en_US',
    images: [{ url: logo.src, alt: logo.alt }],
  },

  // ---------- Twitter / X previews ----------
  twitter: {
    card: 'summary_large_image',
    title: organization.name,
    description: organization.description,
    images: [logo.src],
  },

  // ---------- Search engine behaviour ----------
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  // Tells the browser this is a real organization (helps search engines).
  other: {
    'format-detection': 'telephone=no',
  },
};

// Colours used by mobile browsers for the address bar.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#115C53',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          FONTS
          Inter  = the main text font
          Lora   = the heading font (used through font-display)
          If the fonts cannot be downloaded, the browser falls back to
          Georgia / Segoe UI, so the website still looks correct offline.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className="flex min-h-screen flex-col bg-white">
        {/*
          STRUCTURED DATA (SEO)
          This hidden block tells search engines the organization's name and
          website address. It is invisible to visitors.
        */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'NGO',
              name: organization.name,
              description: organization.description,
              url: siteUrl,
              logo: `${siteUrl}${logo.src}`,
            }),
          }}
        />

        {children}
      </body>
    </html>
  );
}
