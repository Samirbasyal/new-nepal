// ========================================
// ADMIN PANEL
// This code controls the Projects & Our Works manager.
// ========================================
// Address: /admin/projects
//
// ONE manager controls BOTH public pages:
//   Type = "Project"   -> the entry appears on /projects
//   Type = "Our Work"  -> the entry appears on /our-works
//
// The validation rules live in lib/validation/schemas.ts -> projectSchema
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { PROJECT_KIND_OPTIONS, PROJECT_STATUS_OPTIONS } from '@/lib/constants';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Projects and Our Works',
  robots: { index: false, follow: false },
};

const COLUMNS: ColumnConfig[] = [
  { name: 'title', label: 'Title' },
  { name: 'kind', label: 'Type', type: 'badge' },
  { name: 'status', label: 'Status', type: 'badge' },
  { name: 'location', label: 'Location', hideOnMobile: true },
  { name: 'isPublished', label: 'Published', toggle: true },
];

const FIELDS: FieldConfig[] = [
  // ---------- Basics ----------
  {
    name: 'title',
    label: 'Title',
    type: 'text',
    required: true,
    placeholder: 'For example: Clean community campaign',
    section: 'Basics',
  },
  {
    name: 'kind',
    label: 'Type',
    type: 'select',
    options: PROJECT_KIND_OPTIONS,
    hint: '"Project" goes to /projects. "Our Work" goes to /our-works.',
    section: 'Basics',
  },
  { name: 'category', label: 'Category', type: 'text', section: 'Basics' },
  { name: 'summary', label: 'Short summary', type: 'textarea', section: 'Basics' },
  { name: 'description', label: 'Full details', type: 'textarea', hint: 'Leave a blank line between paragraphs.', section: 'Basics' },

  // ---------- Details ----------
  { name: 'objectives', label: 'Objectives', type: 'lines', hint: 'One per line.', section: 'Details' },
  { name: 'activities', label: 'Activities carried out', type: 'lines', hint: 'One per line.', section: 'Details' },
  { name: 'results', label: 'Results', type: 'lines', hint: 'One per line. Only real results.', section: 'Details' },
  { name: 'impact', label: 'Impact', type: 'lines', hint: 'One per line.', section: 'Details' },
  {
    name: 'beneficiaries',
    label: 'Who benefited',
    type: 'textarea',
    hint: 'Describe who benefited in your own words. Do NOT invent numbers - if you have a verified figure, put it in Admin Panel → Settings → Impact numbers instead.',
    section: 'Details',
  },
  { name: 'location', label: 'Location', type: 'text', section: 'Details' },
  { name: 'startDate', label: 'Start date', type: 'date', section: 'Details' },
  { name: 'endDate', label: 'End date', type: 'date', section: 'Details' },
  { name: 'status', label: 'Status', type: 'select', options: PROJECT_STATUS_OPTIONS, section: 'Details' },

  // ---------- Picture ----------
  { name: 'imageUrl', label: 'Main picture', type: 'image', uploadable: true, section: 'Picture' },

  // ---------- Publishing ----------
  { name: 'isPublished', label: 'Published on the website', type: 'checkbox', hint: 'Off = saved as a draft.', section: 'Publishing' },
  { name: 'featured', label: 'Show in the homepage preview', type: 'checkbox', section: 'Publishing' },
  { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.', section: 'Publishing' },
  { name: 'slug', label: 'Web address (advanced)', type: 'text', hint: 'Leave empty to build it automatically.', section: 'Publishing' },
];

export default function AdminProjectsPage() {
  return (
    <ResourceManager
      resourceKey="projects"
      entityLabel="Entry"
      title="Projects & Our Works"
      description="One list controls both /projects and /our-works. The Type field decides where an entry appears."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={PROJECT_STATUS_OPTIONS}
      statusField="status"
      defaults={{ kind: 'PROJECT', status: 'PLANNED', isPublished: false, featured: false, sortOrder: 0 }}
    />
  );
}
