// ========================================
// ADMIN PANEL - LANGUAGE SETTINGS
// ========================================
// Address: /admin/language
//
// One switch for the whole website. Only an administrator can open this page
// (requireAdmin) and only an administrator can save it (the API checks again).

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { getLanguage } from '@/lib/i18n-server';
import { LANGUAGES } from '@/lib/i18n';
import { LanguageForm } from '@/components/admin/LanguageForm';

export const metadata: Metadata = { title: 'Language settings' };
export const dynamic = 'force-dynamic';

export default async function AdminLanguagePage() {
  await requireAdmin();

  const current = await getLanguage();
  const native = LANGUAGES.find((item) => item.code === current)?.native ?? current;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Language settings</h1>
        <p className="mt-1 text-sm text-ink-600">
          Active website language: <strong className="text-brand-700">{native}</strong>
        </p>
      </div>

      <LanguageForm current={current} />
    </div>
  );
}
