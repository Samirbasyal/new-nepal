// ========================================
// ADMIN PANEL
// This code controls the Donor / Supporter manager.
// ========================================
// Address: /admin/donors
//
// IMPORTANT PRIVACY RULE
//   A donor is PRIVATE by default. Nothing appears on the public /donors page
//   until you switch on "Show publicly". Only publish information that the
//   supporter has actually agreed to share.
//
//   Donation amounts are NOT stored here. They are recorded separately in
//   Admin Panel -> Donations received, which is never shown publicly.
//
// The validation rules live in lib/validation/schemas.ts -> donorSchema
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Donors and supporters',
  robots: { index: false, follow: false },
};

const COLUMNS: ColumnConfig[] = [
  { name: 'name', label: 'Name' },
  { name: 'organization', label: 'Organization', hideOnMobile: true },
  { name: 'supportArea', label: 'Supports', hideOnMobile: true },
  { name: 'isPublic', label: 'Shown publicly', toggle: true },
];

const FIELDS: FieldConfig[] = [
  // ---------- Details ----------
  { name: 'name', label: 'Contact name', type: 'text', required: true, hint: 'The person we deal with.', section: 'Details' },
  { name: 'organization', label: 'Organization name', type: 'text', hint: 'Leave empty for an individual supporter.', section: 'Details' },
  {
    name: 'supportArea',
    label: 'Area they support',
    type: 'text',
    placeholder: 'For example: Education, Health, General support',
    hint: 'Used to group supporters on the public page.',
    section: 'Details',
  },
  { name: 'description', label: 'Short description', type: 'textarea', hint: 'Only publish what the supporter has agreed to.', section: 'Details' },
  { name: 'websiteUrl', label: 'Website', type: 'url', placeholder: 'https://...', hint: 'Only if the supporter agreed to be linked.', section: 'Details' },

  // ---------- Logo ----------
  { name: 'logoUrl', label: 'Logo', type: 'image', uploadable: true, hint: 'Use the supporter\'s own logo file, with their permission.', section: 'Logo' },

  // ---------- Visibility ----------
  {
    name: 'isPublic',
    label: 'Show publicly on /donors',
    type: 'checkbox',
    hint: 'Off = kept as a private internal record. This is the default on purpose.',
    section: 'Visibility',
  },
  { name: 'isActive', label: 'Active supporter', type: 'checkbox', hint: 'Switch off to hide without deleting the record.', section: 'Visibility' },
  { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.', section: 'Visibility' },
];

export default function AdminDonorsPage() {
  return (
    <ResourceManager
      resourceKey="donors"
      entityLabel="Donor"
      title="Donors & supporters"
      description="Supporters appear on /donors only when 'Show publicly' is switched on."
      fields={FIELDS}
      columns={COLUMNS}
      publishField="isPublic"
      defaults={{ isPublic: false, isActive: true, sortOrder: 0 }}
    />
  );
}
