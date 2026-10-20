import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL
// This code controls the Join Community applications inbox.
// ========================================
// Address: /admin/applications
//
// These come from the public /join form. They are PRIVATE: nothing here is
// ever shown on the public website.
//
// WHAT YOU CAN DO
//   - read every application
//   - search by name, phone, email or message
//   - filter by status (New / Reviewing / Approved / Rejected)
//   - change the status and add an internal note
//   - delete an application
//
// Applications cannot be created by hand here, because they only ever come
// from the public form.
//
// The validation rules live in lib/validation/schemas.ts -> statusUpdateSchema
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { APPLICATION_STATUS_OPTIONS } from '@/lib/constants';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.applications'), robots: { index: false, follow: false } };
}

const COLUMNS: ColumnConfig[] = [
  { name: 'fullName', label: 'Name' },
  { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email', hideOnMobile: true },
  { name: 'areaOfInterest', label: 'Interest', hideOnMobile: true },
  { name: 'message', label: 'Message', type: 'longtext', hideOnMobile: true },
  { name: 'createdAt', label: 'Received', type: 'date', hideOnMobile: true },
  { name: 'status', label: 'Status', type: 'badge' },
];

// The form here only changes the status and the internal note. The personal
// details are shown read-only in the table, so nobody edits them by accident.
const FIELDS: FieldConfig[] = [
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: APPLICATION_STATUS_OPTIONS,
    hint: 'For example: move to "Reviewing" while you check, then "Approved" or "Rejected".',
    section: 'Review',
  },
  {
    name: 'adminNote',
    label: 'Internal note',
    type: 'textarea',
    hint: 'Only administrators can see this. It is never shown to the applicant.',
    section: 'Review',
  },
];

export default function AdminApplicationsPage() {
  return (
    <ResourceManager
      resourceKey="applications"
      entityLabel="Application"
      title="Join applications"
      description="Applications sent through the public Join Community form. These are private and never shown on the website."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={APPLICATION_STATUS_OPTIONS}
      statusField="status"
      canCreate={false}
    />
  );
}
