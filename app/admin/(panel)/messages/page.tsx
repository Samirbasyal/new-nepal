import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL
// This code controls the Contact messages inbox.
// ========================================
// Address: /admin/messages
//
// These come from the public /contact form and are PRIVATE.
//
// WHAT YOU CAN DO
//   - read every message
//   - search by name, email, subject or text
//   - filter by status (New / Read / Replied / Archived)
//   - change the status
//   - delete a message
//
// This project does not send e-mail by itself, so replying means using your
// normal e-mail program with the address shown in the table. See the notes in
// app/api/contact/route.ts if you later want automatic notification e-mails.
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { MESSAGE_STATUS_OPTIONS } from '@/lib/constants';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.messages'), robots: { index: false, follow: false } };
}

const COLUMNS: ColumnConfig[] = [
  { name: 'name', label: 'From' },
  { name: 'email', label: 'Email', hideOnMobile: true },
  { name: 'subject', label: 'Subject', hideOnMobile: true },
  { name: 'message', label: 'Message', type: 'longtext', hideOnMobile: true },
  { name: 'createdAt', label: 'Received', type: 'nepali-date', hideOnMobile: true },
  { name: 'status', label: 'Status', type: 'badge' },
];

const FIELDS: FieldConfig[] = [
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: MESSAGE_STATUS_OPTIONS,
    hint: 'Move a message to "Read" once you have seen it, and "Replied" after you answer.',
    section: 'Review',
  },
];

export default function AdminMessagesPage() {
  return (
    <ResourceManager
      resourceKey="messages"
      entityLabel="Message"
      title="Contact messages"
      description="Messages sent through the public Contact form. These are private and never shown on the website."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={MESSAGE_STATUS_OPTIONS}
      statusField="status"
      canCreate={false}
    />
  );
}
