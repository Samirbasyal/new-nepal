// ========================================
// ADMIN PANEL
// This code controls the Programs manager.
// ========================================
// Address: /admin/programs
//
// Add, edit, delete, publish and search programs.
// Anything you switch to "Published" appears on /programs and, when
// "Featured" is also on, in the homepage preview.
//
// The validation rules for these fields live in
// lib/validation/schemas.ts -> programSchema
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { PROGRAM_STATUS_OPTIONS } from '@/lib/constants';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Programs',
  robots: { index: false, follow: false },
};

// ========================================
// READ THE LIST OF PROJECTS
// Used so a program can be linked to the project it belongs to.
// ========================================
async function getProjectOptions() {
  if (!isDatabaseConfigured()) return [];

  try {
    const projects = await prisma.project.findMany({
      select: { id: true, title: true, kind: true },
      orderBy: { title: 'asc' },
    });

    return projects.map((project) => ({
      value: project.id,
      label: `${project.title} (${project.kind === 'WORK' ? 'Our Work' : 'Project'})`,
    }));
  } catch {
    return [];
  }
}

// ========================================
// THE FORM FIELDS
// ========================================
const COLUMNS: ColumnConfig[] = [
  { name: 'title', label: 'Program' },
  { name: 'category', label: 'Category', hideOnMobile: true },
  { name: 'status', label: 'Status', type: 'badge' },
  { name: 'startDate', label: 'Starts', type: 'date', hideOnMobile: true },
  { name: 'isPublished', label: 'Published', toggle: true },
];

export default async function AdminProgramsPage() {
  const projectOptions = await getProjectOptions();

  const FIELDS: FieldConfig[] = [
    // ---------- Basics ----------
    {
      name: 'title',
      label: 'Program title',
      type: 'text',
      required: true,
      placeholder: 'For example: Community learning support',
      section: 'Basics',
    },
    { name: 'category', label: 'Category', type: 'text', placeholder: 'Education, Health, Women...', section: 'Basics' },
    { name: 'summary', label: 'Short summary', type: 'textarea', hint: 'One or two lines shown on the card.', section: 'Basics' },
    { name: 'description', label: 'Full details', type: 'textarea', hint: 'Leave a blank line between paragraphs.', section: 'Basics' },

    // ---------- Details ----------
    { name: 'objectives', label: 'Objectives', type: 'lines', hint: 'One objective per line.', section: 'Details' },
    { name: 'results', label: 'Results / impact so far', type: 'lines', hint: 'One result per line. Only write what really happened.', section: 'Details' },
    { name: 'targetGroup', label: 'Who is this for?', type: 'text', placeholder: 'For example: students, women, families', section: 'Details' },
    { name: 'location', label: 'Location', type: 'text', section: 'Details' },
    { name: 'startDate', label: 'Start date', type: 'date', section: 'Details' },
    { name: 'endDate', label: 'End date', type: 'date', section: 'Details' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: PROGRAM_STATUS_OPTIONS,
      section: 'Details',
    },
    {
      name: 'projectId',
      label: 'Part of which project?',
      type: 'select',
      options: projectOptions,
      hint: projectOptions.length === 0 ? 'No projects exist yet. Add one first.' : 'Optional.',
      section: 'Details',
    },

    // ---------- Picture ----------
    { name: 'imageUrl', label: 'Picture', type: 'image', uploadable: true, section: 'Picture' },

    // ---------- Publishing ----------
    { name: 'isPublished', label: 'Published on the website', type: 'checkbox', hint: 'Off = saved as a draft and not visible to the public.', section: 'Publishing' },
    { name: 'featured', label: 'Show in the homepage preview', type: 'checkbox', section: 'Publishing' },
    { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.', section: 'Publishing' },
    { name: 'slug', label: 'Web address (advanced)', type: 'text', hint: 'Leave empty to build it automatically from the title.', section: 'Publishing' },
  ];

  return (
    <ResourceManager
      resourceKey="programs"
      entityLabel="Program"
      title="Programs"
      description="Programs appear on /programs and in the homepage preview when featured."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={PROGRAM_STATUS_OPTIONS}
      statusField="status"
      defaults={{ status: 'PLANNED', isPublished: false, featured: false, sortOrder: 0 }}
    />
  );
}
