// ========================================
// TAILWIND CSS CONFIGURATION
// ========================================
// Tailwind turns short class names (like "bg-brand-600") into real CSS.
//
// IMPORTANT FOR BEGINNERS:
// The colours below are NOT written here. They are imported from
// "config/theme.ts". That means you only ever change colours in ONE file:
//
//        config/theme.ts
//
// This file simply tells Tailwind: "make the colours from theme.ts
// available as bg-brand-600, text-accent-500, border-ink-200, ...".
// ========================================

import type { Config } from 'tailwindcss';
import { themeColors, fontFamilies, statusColors } from './config/theme';

const config: Config = {
  // ========================================
  // FILES TAILWIND SHOULD SCAN FOR CLASS NAMES
  // ========================================
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],

  theme: {
    extend: {
      // ========================================
      // COLORS / THEME
      // Imported from config/theme.ts - change colours there, not here.
      // ========================================
      colors: {
        ...themeColors,
        // Semantic helper colours so we can write "text-success" etc.
        success: statusColors.success,
        'success-soft': statusColors.successSoft,
        warning: statusColors.warning,
        'warning-soft': statusColors.warningSoft,
        danger: statusColors.danger,
        'danger-soft': statusColors.dangerSoft,
        info: statusColors.info,
        'info-soft': statusColors.infoSoft,
      },

      // ========================================
      // FONTS
      // ========================================
      fontFamily: fontFamilies,

      // ========================================
      // SPACING / SIZING HELPERS FOR A CONSISTENT LAYOUT
      // ========================================
      maxWidth: {
        content: '76rem',
        prose: '48rem',
      },

      // rounded-card and rounded-btn are the two corner styles used across
      // the whole website, so they stay consistent everywhere.
      borderRadius: {
        card: '1rem',
        btn: '0.625rem',
      },

      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.18)',
        'card-hover': '0 4px 8px rgba(15, 23, 42, 0.06), 0 18px 40px -16px rgba(15, 23, 42, 0.28)',
      },

      // ========================================
      // LIGHTWEIGHT ANIMATIONS (fade in / slide up)
      // ========================================
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
      },

      // ========================================
      // CONTAINER WIDTH
      // ========================================
      screens: {
        xs: '375px',
      },
    },
  },

  plugins: [],
};

export default config;
