// ========================================
// READ THE ACTIVE LANGUAGE (server side)
// ========================================
// Every server component asks this one function. It reads the setting the
// administrator saved, so the public site, the member panel and the admin panel
// can never disagree about the language.

import { isLang, type Lang } from '@/lib/i18n';
import { readSettingValue } from '@/lib/settings';

export async function getLanguage(): Promise<Lang> {
  const value = await readSettingValue('site.language', 'en');
  return isLang(value) ? value : 'en';
}
