'use client';

// ========================================
// ONE TRANSLATED PIECE OF TEXT
// ========================================
// Server pages cannot read the language context, but they can render this tiny
// client component. Wrap any visible English sentence:
//
//   <T text="My tasks" />
//
// It returns the Nepali sentence when the website language is Nepali and the
// original English when the sentence has no translation yet.
// ========================================

import { useLang } from '@/components/ui/LangProvider';

export function T({ text }: { text: string }) {
  const { tr } = useLang();
  return <>{tr(text)}</>;
}
