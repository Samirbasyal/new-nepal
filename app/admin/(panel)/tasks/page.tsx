import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL
// This code controls the Member Tasks manager.
// ========================================
// Address: /admin/tasks
//
// Give a task to a member. It appears in that member's panel under
// /member/tasks, where they can move it between
// To do  ->  In progress  ->  Done.
//
// Only administrators can create, edit or delete tasks.
// The validation rules live in lib/validation/schemas.ts -> taskSchema
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '@/lib/constants';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.tasks'), robots: { index: false, follow: false } };
}

// NOTE: "assignedTo.name" reads the name from the related member record.
// lib/api/resources.ts loads the related user with  include: { assignedTo: ... }
const COLUMNS: ColumnConfig[] = [
  { name: 'title', label: 'Task' },
  { name: 'assignedTo.name', label: 'Assigned to', hideOnMobile: true },
  { name: 'status', label: 'Status', type: 'badge' },
  { name: 'priority', label: 'Priority', type: 'badge', hideOnMobile: true },
  { name: 'dueDate', label: 'Due', type: 'date', hideOnMobile: true },
];

// ========================================
// TASK LIST PREPARATION
// ========================================
// The task table stores the member id, but the Admin Panel should show the
// member's NAME. The API returns the related user object, so we look the name
// up from there. This small helper is used by the table column above.
async function getMemberOptions() {
  if (!isDatabaseConfigured()) return [];

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    return users.map((user) => ({
      value: user.id,
      label: `${user.name}${user.role === 'ADMIN' ? ' (administrator)' : ''} — ${user.email}`,
    }));
  } catch {
    return [];
  }
}

export default async function AdminTasksPage() {
  const memberOptions = await getMemberOptions();

  const FIELDS: FieldConfig[] = [
    { name: 'title', label: 'Task title', type: 'text', required: true, section: 'Task' },
    { name: 'description', label: 'What needs to be done?', type: 'textarea', section: 'Task' },
    {
      name: 'assignedToId',
      label: 'Assign to',
      type: 'select',
      required: true,
      options: memberOptions,
      hint: memberOptions.length === 0 ? 'No active accounts yet. Add a member first.' : 'The task appears in that person\'s member panel.',
      section: 'Task',
    },
    { name: 'dueDate', label: 'Due date', type: 'date', hint: 'Optional.', section: 'Task' },
    { name: 'status', label: 'Status', type: 'select', options: TASK_STATUS_OPTIONS, section: 'Task' },
    { name: 'priority', label: 'Priority', type: 'select', options: TASK_PRIORITY_OPTIONS, section: 'Task' },
  ];

  return (
    <ResourceManager
      resourceKey="tasks"
      entityLabel="Task"
      title="Member tasks"
      description="Tasks assigned to members. Members can update the status of their own tasks from their panel."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={TASK_STATUS_OPTIONS}
      statusField="status"
      defaults={{ status: 'TODO', priority: 'NORMAL' }}
    />
  );
}
