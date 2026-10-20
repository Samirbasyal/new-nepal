'use client';

// ========================================
// LANGUAGE FOR THE PANEL SCREENS
// ========================================
// The public pages and the menus read their words from lib/i18n.ts, which uses
// short keys ("admin.members"). The panel screens were written before that
// existed, and their words sit inside the pages themselves - "Donors &
// supporters", "Add new", "Expenses" and so on.
//
// Rewriting every one of those pages by hand would have been a very large and
// risky change. Instead this provider translates by the ENGLISH SENTENCE: the
// screen asks for tr('Add new') and gets "नयाँ थप्नुहोस्" when the website
// language is Nepali.
//
// WHY THIS IS SAFE
//   If a sentence is not in lib/phrases.ts the original English is returned
//   unchanged. A missing translation therefore never breaks a screen and never
//   shows an empty label - it simply stays English until it is added.
//
// The provider also exposes t(), so a screen can still use a key from
// lib/i18n.ts when that is more convenient.
// ========================================

import { createContext, useContext, useMemo } from 'react';
import { t as tKey, type Lang } from '@/lib/i18n';
import { translatePhrase } from '@/lib/phrases';

type LangContextValue = {
  lang: Lang;
  /** Translate a plain English sentence. Falls back to the English text. */
  tr: (text: string) => string;
  /** Translate a key from lib/i18n.ts. Falls back to the key itself. */
  t: (key: string) => string;
};

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  tr: (text) => text,
  t: (key) => key,
});

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      tr: (text: string) => translatePhrase(lang, text),
      t: (key: string) => tKey(lang, key),
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Current panel language plus the two translate helpers. */
export function useLang(): LangContextValue {
  return useContext(LangContext);
}
