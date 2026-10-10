// ========================================
// ADMIN PANEL
// This code controls the Website Settings page.
// ========================================
// Address: /admin/settings
//
// This page is how the organization changes its own information WITHOUT
// touching any code:
//
//   - organization name, tagline and description
//   - address, phone numbers, email, office hours
//   - social media links
//   - homepage heading, sub-heading and introduction
//   - donation information (bank details, QR picture, other methods)
//   - impact numbers (leave empty and they are hidden on the website)
//   - the Join Community introduction and the registration switch
//
// THE COMPLETE LIST OF SETTINGS, WITH EXPLANATIONS, IS IN: lib/settings.ts
// ========================================

import type { Metadata } from 'next';
import { SettingsForm } from '@/components/admin/SettingsForm';
import {
  SETTING_DEFINITIONS,
  SETTING_GROUP_TITLES,
  getSettings,
  settingsByGroup,
} from '@/lib/settings';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Website settings',
  robots: { index: false, follow: false },
};

// ========================================
// EXTRA EXPLANATIONS SHOWN UNDER EACH GROUP TITLE
// ========================================
const GROUP_NOTES: Record<string, string> = {
  ORGANIZATION:
    'The organization name is used in the navbar, footer, page titles and search results. Leave the optional fields empty if the information is not confirmed yet.',
  CONTACT:
    'These details appear on the Contact page and in the footer. Values in [square brackets] are placeholders - replace them with your real details.',
  SOCIAL:
    'Leave a link empty and its icon is hidden automatically. Only add pages you actually control.',
  HOMEPAGE:
    'The heading and sub-heading shown at the top of the home page, plus the introduction paragraph.',
  DONATE:
    'Public donation information only. This is normal banking information you choose to publish - never put online banking passwords or card details anywhere on this website.',
  IMPACT:
    'IMPORTANT: leave these EMPTY unless you have real, verified figures. While a value is empty the number block is completely hidden, so the website never shows invented statistics.',
  JOIN:
    'Set the registration switch to "false" to stop the public from creating member accounts. Administrators can still add members from Admin Panel → Members.',
};

export default async function AdminSettingsPage() {
  const current = await getSettings();
  const grouped = settingsByGroup();

  // Build the groups in the order they are declared in lib/settings.ts.
  const groups = [...grouped.entries()].map(([groupKey, fields]) => ({
    title: SETTING_GROUP_TITLES[groupKey] ?? groupKey,
    note: GROUP_NOTES[groupKey],
    fields: fields.map((field) => ({
      key: field.key,
      label: field.label,
      group: field.group,
      default: field.default,
      type: field.type,
    })),
  }));

  // The values that are currently saved (or the defaults).
  const initialValues: Record<string, string> = {};
  for (const definition of SETTING_DEFINITIONS) {
    initialValues[definition.key] = current[definition.key] ?? definition.default;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900">Website settings</h1>
        <p className="mt-1 text-sm text-ink-600">
          Change the organization&apos;s own information here. No code editing is needed.
        </p>
      </header>

      {/* ========================================
          IMPORTANT REMINDERS
          ======================================== */}
      <Alert tone="info" title="How placeholders work">
        <p>
          Text in <strong>[square brackets]</strong> is a placeholder that ships with the project.
          Replace it with your real information. Placeholders are shown on the public website until
          you do, so visitors are never given false information.
        </p>
      </Alert>

      <div className="rounded-card border border-ink-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Icon name="lock" className="h-4 w-4 text-brand-600" />
          What does NOT belong on this page
        </h2>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-600">
          <li>· Card numbers, wallet PINs, online banking passwords or secret keys</li>
          <li>· Anything a supporter has not agreed to have published</li>
          <li>· Impact numbers you cannot verify</li>
        </ul>
      </div>

      <SettingsForm groups={groups} initialValues={initialValues} />
    </div>
  );
}
