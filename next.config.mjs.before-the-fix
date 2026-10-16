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
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
