// ========================================
// WEBSITE COLOR / THEME CONFIGURATION
// Change colors from this file.
// ========================================
//
// HOW TO CHANGE THE WEBSITE COLORS
// --------------------------------
// Every colour used on the website comes from this ONE file.
// 1. Find the scale you want to change (usually "brand" = main colour,
//    "accent" = the secondary highlight colour).
// 2. Change the hex codes (for example "#157466").
// 3. Save the file. The whole website updates automatically.
//
// TIP: each scale goes from 50 (very light) to 950 (very dark).
// "600" is usually the main button colour and "700" the hover colour.
// You can generate nice scales for free at https://uicolors.app
//
// IMPORTANT: after changing colours here you must restart the dev server
// (stop it with CTRL+C, then run "npm run dev" again).
// ========================================

// ------------------------------------------------------------------
// MAIN BRAND COLOR (deep teal-green = trust, growth, community)
// ------------------------------------------------------------------
export const brand = {
  50: '#EFF9F6',
  100: '#D7F0E9',
  200: '#AFE1D4',
  300: '#7CCBB9',
  400: '#47AF9A',
  500: '#239382',
  600: '#157466', // <-- MAIN COLOUR (buttons, links, highlights)
  700: '#115C53',
  800: '#104A44',
  900: '#0F3E39',
  950: '#052623',
};

// ------------------------------------------------------------------
// ACCENT COLOR (warm amber = hope, energy, action, donate buttons)
// ------------------------------------------------------------------
export const accent = {
  50: '#FFF8EB',
  100: '#FDECC8',
  200: '#FBD88D',
  300: '#F8BE52',
  400: '#F5A524',
  500: '#E4880B', // <-- MAIN ACCENT (call-to-action buttons)
  600: '#C46A08',
  700: '#A34F0C',
  800: '#853F10',
  900: '#6E3411',
  950: '#401A05',
};

// ------------------------------------------------------------------
// NEUTRAL COLOR (backgrounds, text, borders)
// ------------------------------------------------------------------
export const neutral = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#020617',
};

// ------------------------------------------------------------------
// STATUS COLORS (used for messages, badges, alerts)
// ------------------------------------------------------------------
export const statusColors = {
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
};

// ------------------------------------------------------------------
// TYPOGRAPHY
// Change the font family here (these fonts are loaded in app/layout.tsx).
// ------------------------------------------------------------------
export const fontFamilies = {
  sans: ['var(--font-sans)', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
  display: ['var(--font-display)', 'Georgia', 'Cambria', 'serif'],
};

// ------------------------------------------------------------------
// ROUNDED CORNERS / SHADOWS / ANIMATION SPEED
// ------------------------------------------------------------------
export const designTokens = {
  radius: {
    card: '1rem',
    button: '0.625rem',
  },
  shadows: {
    card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.18)',
    cardHover: '0 4px 8px rgba(15, 23, 42, 0.06), 0 18px 40px -16px rgba(15, 23, 42, 0.28)',
  },
};

// ------------------------------------------------------------------
// GRADIENTS (used on the hero banner and call-to-action blocks)
// ------------------------------------------------------------------
export const gradients = {
  hero: `linear-gradient(135deg, ${brand[900]} 0%, ${brand[700]} 45%, ${brand[600]} 100%)`,
  accentBar: `linear-gradient(90deg, ${accent[400]} 0%, ${accent[500]} 100%)`,
  softBrand: `linear-gradient(180deg, ${brand[50]} 0%, #ffffff 100%)`,
};

// ------------------------------------------------------------------
// EXPORT FOR tailwind.config.ts
// Tailwind needs the colours grouped under "colors".
// ------------------------------------------------------------------
export const themeColors = {
  brand,
  accent,
  ink: neutral,
};
