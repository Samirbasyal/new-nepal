// ========================================
// ADMIN PANEL - DONORS & SUPPORTERS
// ========================================
// Address: /admin/donors
//
// THE PRIVACY RULE, IN ONE PLACE
//   A donor is PRIVATE until an administrator deliberately switches "Public"
//   on. A private donor is not sent to the public page, is not counted there,
//   and cannot be reached through any public address. Only this screen and the
//   server routes behind it can see the record.
//
// WHAT A DONOR RECORD HOLDS
//   The gallery card shows two things: the photo and the name. Everything else -
//
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Donors and supporters',
  robots: { index: false, follow: false },
};

// ========================================
// THE TABLE
// ========================================
// "Visibility" is the toggle column: green means the donor is on the public
// gallery. Flipping it takes effect on the next page load of /donors, because
// that page reads the database every time.
const COLUMNS: ColumnConfig[] = [
  { name: 'name', label: 'Name' },
  { name: 'address', label: 'Address', hideOnMobile: true },
  { name: 'donationPurpose', label: 'Donation purpose', hideOnMobile: true },
  // The switch in the table is the quick publish / unpublish: green means the
  // donor is on the public gallery right now.
  { name: 'isPublic', label: 'Visibility', toggle: true },
];

// ========================================
// THE FORM
// ========================================
const FIELDS: FieldConfig[] = [
  // ---------- who the donor is ----------
  {
    name: 'name',
    label: 'Donor name',
    type: 'text',
    required: true,
    hint: 'Printed under the photo on the public gallery.',
    section: 'Donor',
  },
  {
    name: 'address',
    label: 'Address',
    type: 'text',
    required: true,
    placeholder: 'For example: Kathmandu, Nepal',
    hint: 'Shown only after a visitor clicks the card.',
    section: 'Donor',
  },
  {
    name: 'occupation',
    label: 'Occupation',
    type: 'text',
    required: false,
    placeholder: 'For example: Teacher, farmer, shop owner',
    hint: 'Optional. Left out of the detail panel when empty.',
    section: 'Donor',
  },

  // ---------- what the gift was for ----------
  {
    name: 'donationPurpose',
    label: 'Donation purpose',
    type: 'text',
    required: true,
    placeholder: 'For example: Education support, Emergency relief',
    hint: 'What the donation was given for. Shown in the detail panel.',
    section: 'The donation',
  },
  {
    name: 'description',
    label: 'Short description',
    type: 'textarea',
    required: true,
    placeholder: 'One or two sentences about this contribution.',
    hint: 'A brief explanation of the donor\u2019s contribution. Visible to the public, so only write what the donor agreed to.',
    section: 'The donation',
  },

  // ---------- the picture ----------
  {
    name: 'logoUrl',
    label: 'Donor photo',
    type: 'image',
    uploadable: true,
    hint: 'Optional. Without a photo the gallery shows a tidy initial instead. Use a picture the donor gave you permission to publish.',
    section: 'Photo',
  },

  // ---------- visibility ----------
  // Deliberately the last section, and deliberately worded as two states rather
  // than a tick box called "something": this is the switch that decides whether a
  // person's name appears on the internet.
  // Two named states, not a tick box whose meaning has to be guessed. Private is
  // listed first because it is the default: a new record is never public until
  // an administrator deliberately chooses Public.
  {
    name: 'isPublic',
    label: 'Visibility',
    type: 'radio',
    required: true,
    options: [
      { value: 'false', label: 'Private - only in this panel (default)' },
      { value: 'true', label: 'Public - show on the website' },
    ],
    hint: 'Private donors never appear on the home page, the gallery, in search results or in donor counts, and their photo cannot be opened by the public. Switching back to Private removes them at once.',
    section: 'Visibility',
  },
  {
    name: 'isActive',
    label: 'Active supporter',
    type: 'checkbox',
    hint: 'A second, softer switch. Switch it off to keep the record but hide it everywhere, without deleting anything.',
    section: 'Visibility',
  },
  {
    name: 'sortOrder',
    label: 'Sort order',
    type: 'number',
    hint: 'Lower numbers appear first in the gallery.',
    section: 'Visibility',
  },

  // ---------- kept from the old form ----------
  {
    name: 'organization',
    label: 'Organization (optional)',
    type: 'text',
    hint: 'Only when the supporter is a business, club or group rather than one person.',
    section: 'Optional extras',
  },
  {
    name: 'websiteUrl',
    label: 'Website (optional)',
    type: 'url',
    placeholder: 'https://...',
    hint: 'Only if the supporter agreed to be linked.',
    section: 'Optional extras',
  },
];

export default function AdminDonorsPage() {
  return (
    <ResourceManager
      resourceKey="donors"
      entityLabel="Donor"
      title="Donors & supporters"
      description="A new donor is Private until you switch Public on. Private records never reach the public website."
      fields={FIELDS}
      columns={COLUMNS}
      publishField="isPublic"
      defaults={{ isPublic: false, isActive: true, sortOrder: 0 }}
    />
  );
}
