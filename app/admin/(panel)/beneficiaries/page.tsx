// ========================================
// ADMIN PANEL
// This code controls the Beneficiaries manager.
// ========================================
// Address: /admin/beneficiaries
//
// Add the groups of people the organization works with. Nothing is hard-coded,
// so you can create, rename, reorder or hide any group.
//
// ABOUT THE NUMBER FIELD
//   Leave "Number supported" EMPTY unless you have a real, verified figure.
//   While it is empty the website simply does not show a number for that
//   group - so we never publish invented statistics.
//
// The validation rules live in lib/validation/schemas.ts -> beneficiarySchema
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { SELECTABLE_ICONS } from '@/components/ui/Icon';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Beneficiaries',
  robots: { index: false, follow: false },
};

const COLUMNS: ColumnConfig[] = [
  { name: 'name', label: 'Group' },
  { name: 'beneficiaryCount', label: 'Number', type: 'number', hideOnMobile: true },
  { name: 'countLabel', label: 'Unit', hideOnMobile: true },
  { name: 'isPublished', label: 'Visible', toggle: true },
];

const FIELDS: FieldConfig[] = [
  { name: 'name', label: 'Group name', type: 'text', required: true, placeholder: 'For example: Youth', section: 'Group' },
  { name: 'description', label: 'Description', type: 'textarea', hint: 'Explain who this group is and how the organization supports them.', section: 'Group' },
  {
    name: 'iconKey',
    label: 'Icon',
    type: 'select',
    options: SELECTABLE_ICONS.map((icon) => ({ value: icon, label: icon })),
    hint: 'A small picture shown on the card.',
    section: 'Group',
  },
  { name: 'imageUrl', label: 'Picture (optional)', type: 'image', uploadable: true, section: 'Group' },

  // ---------- Numbers (optional, real only) ----------
  {
    name: 'beneficiaryCount',
    label: 'Number supported',
    type: 'number',
    hint: 'Only enter a figure you can verify. Leave EMPTY to hide the number completely.',
    section: 'Numbers (optional)',
  },
  {
    name: 'countLabel',
    label: 'What the number counts',
    type: 'text',
    placeholder: 'For example: people supported, families reached',
    section: 'Numbers (optional)',
  },

  // ---------- Visibility ----------
  { name: 'isPublished', label: 'Visible on the website', type: 'checkbox', section: 'Visibility' },
  { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.', section: 'Visibility' },
  { name: 'slug', label: 'Web address (advanced)', type: 'text', section: 'Visibility' },
];

export default function AdminBeneficiariesPage() {
  return (
    <ResourceManager
      resourceKey="beneficiaries"
      entityLabel="Beneficiary group"
      title="Beneficiaries"
      description="The groups of people the organization serves. A number is shown only when you enter a real one."
      fields={FIELDS}
      columns={COLUMNS}
      defaults={{ isPublished: true, sortOrder: 0, iconKey: 'users' }}
    />
  );
}
