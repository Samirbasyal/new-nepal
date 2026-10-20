// ========================================
// READ THE ACTIVE LANGUAGE (server side)
// ========================================
// Every server component asks this one function, so the public site, the member
// panel and the admin panel can never disagree about the language.
//
// IMPORTANT: noStore() is called first. Without it Next can serve a page that was
// built once (in English) from its cache, and the administrator's new choice
// would not appear until the next deployment. This is the reason the language
// looked "not saved" even though the database already held the new value.

import { unstable_noStore as noStore } from 'next/cache';
import { isLang, type Lang } from '@/lib/i18n';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export async function getLanguage(): Promise<Lang> {
  noStore();

  if (!isDatabaseConfigured()) return 'en';

  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: 'site.language' },
      select: { value: true },
    });

    return isLang(row?.value) ? row.value : 'en';
  } catch {
    return 'en';
  }
}
