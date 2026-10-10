// ========================================
// ADMIN PANEL
// This code controls Karya Samiti (कार्य समिति) management.
// ========================================
// Address: /admin/karya-samiti
//
// WHAT YOU CAN DO HERE
//   - add a committee member
//   - upload / change / remove the profile photo (with a preview)
//   - set the name, the post and the current address (these are PUBLIC)
//   - keep the private information: phone, email, permanent address, date of
//     birth, citizenship, member number, joining dates and internal notes
//   - change the order in which people appear on the public page
//   - mark somebody as a former committee member (kept, not shown)
//   - activate / deactivate, search and filter, and delete
//
// WHERE THE PRIVATE INFORMATION GOES
//   The private columns are stored in the same table, but the PUBLIC page never
//   loads them. It reads the committee through lib/karya/queries.ts, which
//   selects only: fullName, postTitle, currentAddress, photoUrl. So the private
//   values cannot appear on the website even by accident - they are never
//   fetched from the database in the first place.
//
// THE PUBLIC PAGE UPDATES BY ITSELF
//   There is nothing to publish: /karya-samiti reads the database on every
//   visit, so a change here appears on the website immediately.
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { KARYA_STATUS_OPTIONS } from '@/lib/karya/schemas';
import { getKaryaPosts } from '@/lib/karya/queries';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Karya Samiti',
  robots: { index: false, follow: false },
};

const COLUMNS: ColumnConfig[] = [
  { name: 'photoUrl', label: 'Photo', type: 'image' },
  { name: 'fullName', label: 'Name' },
  { name: 'postTitle', label: 'Post', type: 'badge' },
  { name: 'currentAddress', label: 'Current address', hideOnMobile: true },
  { name: 'displayOrder', label: 'Order', type: 'number' },
  { name: 'status', label: 'Current / Former', type: 'badge' },
  { name: 'isActive', label: 'Shown', type: 'boolean' },
];

export default async function AdminKaryaSamitiPage() {
  // The positions the organization has created (used for the drop-down).
  const posts = await getKaryaPosts();

  const postOptions = posts.map((post) => ({
    value: post.id,
    label: post.nameEn ? `${post.name} (${post.nameEn})` : post.name,
  }));

  const FIELDS: FieldConfig[] = [
    // ========================================
    // PUBLIC INFORMATION
    // Everything in this box appears on the website.
    // ========================================
    {
      name: 'fullName',
      label: 'Full name',
      type: 'text',
      required: true,
      placeholder: 'For example: राम बहादुर श्रेष्ठ',
      hint: 'Shown publicly exactly as typed here.',
      section: 'Public information',
    },
    {
      name: 'postTitle',
      label: 'Post / position',
      type: 'text',
      required: true,
      placeholder: 'For example: अध्यक्ष',
      hint: 'Shown publicly. You can type any position - the list below is only a starting point.',
      section: 'Public information',
    },
    {
      name: 'postId',
      label: 'Link to a saved position (optional)',
      type: 'select',
      options: postOptions,
      hint:
        postOptions.length === 0
          ? 'No positions saved yet. Add them under "Committee posts".'
          : 'Used for grouping and ordering in reports. The text box above is what is printed.',
      section: 'Public information',
    },
    {
      name: 'currentAddress',
      label: 'Current address',
      type: 'text',
      placeholder: 'For example: काठमाडौं, नेपाल',
      hint: 'Shown publicly. Use the permanent address field below for the private one.',
      section: 'Public information',
    },
    {
      name: 'photoUrl',
      label: 'Profile photo',
      type: 'image',
      uploadable: true,
      hint: 'A square photo works best. If there is no photo, a placeholder with the initials is shown.',
      section: 'Public information',
    },
    {
      name: 'displayOrder',
      label: 'Display order',
      type: 'number',
      hint: 'Lower numbers appear first. Example: Chairperson 1, Vice chairperson 2, Secretary 3.',
      section: 'Public information',
    },
    {
      name: 'status',
      label: 'Current or former',
      type: 'select',
      options: KARYA_STATUS_OPTIONS,
      hint: 'Only CURRENT members appear on the public page (unless former members are switched on in Settings).',
      section: 'Public information',
    },
    {
      name: 'isActive',
      label: 'Show on the website',
      type: 'checkbox',
      hint: 'Switch off to keep the record but hide the person from the public page.',
      section: 'Public information',
    },

    // ========================================
    // PRIVATE INFORMATION (ADMIN ONLY)
    // Never shown to visitors, and never loaded by the public page.
    // ========================================
    {
      name: 'phone',
      label: 'Phone number',
      type: 'text',
      hint: 'Private - used for office contact only.',
      section: 'Private information (admin only)',
    },
    { name: 'email', label: 'Email address', type: 'email', hint: 'Private.', section: 'Private information (admin only)' },
    { name: 'permanentAddress', label: 'Permanent address', type: 'text', hint: 'Private.', section: 'Private information (admin only)' },
    { name: 'dateOfBirth', label: 'Date of birth', type: 'date', hint: 'Private.', section: 'Private information (admin only)' },
    { name: 'citizenshipNo', label: 'Citizenship number', type: 'text', hint: 'Private. Keep this out of any public document.', section: 'Private information (admin only)' },
    { name: 'citizenshipDistrict', label: 'Citizenship issued district', type: 'text', hint: 'Private.', section: 'Private information (admin only)' },
    { name: 'memberCode', label: 'Member number', type: 'text', hint: 'The office number kept for this person. Private.', section: 'Private information (admin only)' },
    { name: 'joiningDate', label: 'Joined the organization', type: 'date', hint: 'Private.', section: 'Private information (admin only)' },
    { name: 'committeeJoiningDate', label: 'Joined the committee', type: 'date', hint: 'Private.', section: 'Private information (admin only)' },
    {
      name: 'internalNotes',
      label: 'Internal notes',
      type: 'textarea',
      hint: 'Private. Anything the office needs to remember about this person.',
      section: 'Private information (admin only)',
    },
  ];

  return (
    <ResourceManager
      resourceKey="karya-samiti"
      entityLabel="Committee member"
      title="Karya Samiti"
      description="The working committee. Name, post, current address and photo are shown publicly; everything in the private box stays inside the Admin Panel."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={KARYA_STATUS_OPTIONS}
      statusField="status"
      defaults={{
        status: 'CURRENT',
        isActive: true,
        displayOrder: 0,
      }}
    />
  );
}
