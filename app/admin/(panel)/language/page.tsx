// ========================================
// ADMIN PANEL - LANGUAGE SETTINGS
// ========================================
// Address: /admin/language
//
// One switch for the whole website. Only an administrator can open this page
// (requireAdmin) and only an administrator can save it (the API checks again).
//
// The layout follows the approved design: the setting on the left, a short
// explanation card on the right.
// ========================================

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { getLanguage } from '@/lib/i18n-server';
import { LANGUAGES, t } from '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { LanguageForm } from '@/components/admin/LanguageForm';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.language'), robots: { index: false, follow: false } };
}
export const dynamic = 'force-dynamic';

// The points listed in the explanation card on the right.
const POINTS = [
  'Admin can select Nepali or English',
  'Global setting for all users',
  'Saved in database',
  'Changes apply immediately',
  'Only authorized admins can change',
];

export default async function AdminLanguagePage() {
  await requireAdmin();

  const current = await getLanguage();
  const native = LANGUAGES.find((item) => item.code === current)?.native ?? current;

  return (
    <div className="space-y-6">
      {/* ---------- Heading ---------- */}
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900">
          <T text="Language Settings" />
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          <T text="Set the global language for the entire website. This will be applied to all users." />
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ---------- The setting ---------- */}
        <div className="xl:col-span-8">
          <LanguageForm current={current} />
        </div>

        {/* ---------- What this setting does ---------- */}
        <aside className="xl:col-span-4">
          <div className="card p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Icon name="settings" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold leading-snug text-ink-900">
                  <T text="Admin Panel Language Settings" />
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  <T text="One switch for the public website and every panel." />
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-3">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-ink-700">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <T text={point} />
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-xs text-ink-600">
              <T text="Currently live:" /> <strong className="text-ink-900">{native}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
