// ========================================
// ROBOTS.TXT (INSTRUCTIONS FOR SEARCH ENGINES)
// ========================================
// This file tells search engines which pages they may look at.
//
// The private areas (/admin, /member and the API) are closed to search
// engines. Note that this is only a polite request to search engines - the
// REAL protection of those pages is the server-side authorization in
// lib/auth/guards.ts, lib/api/guard.ts and middleware.ts.
//
// The result is available at:  https://your-address/robots.txt
// ========================================

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/', // Admin Panel
          '/admin', // Admin Panel (without trailing slash)
          '/member/', // Member Panel pages that require signing in
          '/api/', // All API endpoints
          '/unauthorized', // The "not authorized" page
          '/uploads/', // Uploaded files are not useful in search results
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
