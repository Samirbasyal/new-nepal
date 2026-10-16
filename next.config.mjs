// ========================================
// NEXT.JS CONFIGURATION
// This file configures the Next.js framework itself.
// IMPORTANT: The "images.remotePatterns" block below decides which external
// image addresses are allowed. We allow any https address so that the Admin
// Panel can paste image links from the internet.
// ========================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Show helpful warnings while developing.
  reactStrictMode: true,

  // Do not advertise the framework version in response headers (small security win).
  poweredByHeader: false,

  images: {
    // ========================================
    // IMAGE HANDLING
    // Admin-entered external image links are allowed over https.
    // If you want to restrict this later, replace the wildcard hostname
    // below with your own domain(s), e.g. { protocol: 'https', hostname: 'example.com' }.
    // ========================================
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // ========================================
  // PICTURES THAT LIVE IN THE BLOB STORE
  // ========================================
  // A picture uploaded through the Admin Panel is kept in the Vercel Blob
  // store, not inside this project - Vercel's disk cannot keep files.
  //
  // The database still remembers it as /uploads/2026/10/img-123-a1b2.jpg, so
  // the browser asks the website for that address.
  //
  // "afterFiles" means: first look in this project's own public/ folder (where
  // the original pictures live, and they must keep working), and only if the
  // file is NOT there, hand the request to /api/public-files/... which fetches
  // it from the Blob store.
  //
  // Do not change "afterFiles" to "beforeFiles": that would send every picture
  // request through the route, stop the project's own pictures from being
  // served directly, and make the website slower.
  // ========================================
  async rewrites() {
    return {
      afterFiles: [
        { source: '/uploads/:path*', destination: '/api/public-files/:path*' },
      ],
    };
  },

  // ========================================
  // BUILD SETTINGS
  // The ESLint check is run separately with "npm run lint" so that a lint
  // warning never blocks a deployment on Vercel.
  // ========================================
  // ========================================
  // CLIENT ROUTER CACHE (SPEED OF CLICKING AROUND)
  // ========================================
  // Every page here is rendered fresh on the server, because the information
  // (members, payments, news) has to be current. Next.js 15's default for such
  // pages is to remember nothing at all, so even clicking straight back to the
  // page you were just looking at waited for the server again.
  //
  // These two numbers let the browser reuse a page it has just shown: for 30
  // seconds for a page that reads the database, and 3 minutes for one that
  // does not. Saving, approving or rejecting anything calls router.refresh(),
  // which throws the reused copy away, so a figure you have just changed is
  // never shown stale.
  //
  // Want to go back to always asking the server? Set dynamic to 0.
  // ========================================
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },

  // ========================================
  // BUILD SETTINGS
  // ========================================
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
