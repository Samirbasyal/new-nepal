// ========================================
// SAVE THE WEBSITE LANGUAGE (admin only)
// ========================================
// POST /api/admin/language   { language: 'en' | 'ne' }
//
// Only a signed-in administrator may change it: the session is checked on the
// server, so a normal member (or a visitor) cannot call this endpoint.

import { revalidatePath } from 'next/cache';
import { fail, ok, readJson } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { isLang } from '@/lib/i18n';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) {
    return fail('The database is not configured, so the language cannot be saved.', 503);
  }

  const body = (await readJson(request)) as { language?: string } | null;
  if (!body || !isLang(body.language)) {
    return fail('Choose either English or Nepali.', 422, {
      language: 'Choose either English or Nepali.',
    });
  }

  await prisma.siteSetting.upsert({
    where: { key: 'site.language' },
    update: { value: body.language },
    create: { key: 'site.language', value: body.language },
  });

  // Every page reads the setting, so clear the cached HTML for the whole site.
  revalidatePath('/', 'layout');

  return ok({ language: body.language }, 200, 'Website language saved.');
}
