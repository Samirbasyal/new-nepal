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
