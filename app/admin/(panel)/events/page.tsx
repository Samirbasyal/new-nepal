import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL
// This code controls the Events manager.
// ========================================
// Address: /admin/events
//
// Events appear on /events and, when their start date is in the future, in the
// homepage "Upcoming events" section.
//
// The validation rules live in lib/validation/schemas.ts -> eventSchema
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { EVENT_STATUS_OPTIONS } from '@/lib/constants';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.events'), robots: { index: false, follow: false } };
}

const COLUMNS: ColumnConfig[] = [
  { name: 'title', label: 'Event' },
  { name: 'startsAt', label: 'Date and time', type: 'datetime' },
  { name: 'location', label: 'Location', hideOnMobile: true },
  { name: 'status', label: 'Status', type: 'badge' },
  { name: 'isPublished', label: 'Published', toggle: true },
];

const FIELDS: FieldConfig[] = [
  // ---------- Basics ----------
  { name: 'title', label: 'Event title', type: 'text', required: true, section: 'Basics' },
  {
    name: 'startsAt',
    label: 'Starts at',
    type: 'datetime',
    hint: 'Date and time the event begins.',
    section: 'Basics',
  },
  { name: 'endsAt', label: 'Ends at', type: 'datetime', hint: 'Optional.', section: 'Basics' },
  { name: 'location', label: 'Location', type: 'text', section: 'Basics' },
  { name: 'summary', label: 'Short summary', type: 'textarea', section: 'Basics' },
  { name: 'description', label: 'Full description', type: 'textarea', hint: 'Leave a blank line between paragraphs.', section: 'Basics' },

  // ---------- Taking part ----------
  {
    name: 'registrationInfo',
    label: 'How to take part',
    type: 'textarea',
    hint: 'For example: "Call 98XXXXXXXX to register" or a link to a sign-up form. Shown in the sidebar.',
    section: 'Taking part',
  },
  { name: 'status', label: 'Status', type: 'select', options: EVENT_STATUS_OPTIONS, hint: 'Past events are shown automatically as "Completed" on the website.', section: 'Taking part' },

  // ---------- Picture ----------
  { name: 'imageUrl', label: 'Event picture', type: 'image', uploadable: true, section: 'Picture' },

  // ---------- Publishing ----------
  { name: 'isPublished', label: 'Published on the website', type: 'checkbox', section: 'Publishing' },
  { name: 'featured', label: 'Featured', type: 'checkbox', section: 'Publishing' },
  { name: 'slug', label: 'Web address (advanced)', type: 'text', section: 'Publishing' },
];

export default function AdminEventsPage() {
  return (
    <ResourceManager
      resourceKey="events"
      entityLabel="Event"
      title="Events"
      description="Events appear on /events, sorted by date. Future events also appear on the homepage."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={EVENT_STATUS_OPTIONS}
      statusField="status"
      defaults={{ status: 'UPCOMING', isPublished: false, featured: false }}
    />
  );
}
