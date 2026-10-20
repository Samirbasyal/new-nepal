import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - COMMITTEE RESPONSIBILITIES
// ========================================
// Address: /admin/karya-samiti/duties
//
// Give a committee member a responsibility: what they must do, any private
// instructions, a deadline and a status.
//
// The member sees it in their own panel under "Your Role & Responsibilities"
// (/member/duties). They see ONLY their own rows - the member page filters by
// their user id, not by a field in the browser.
//
// NOTHING IS HARD-CODED PER POST. The office writes the duties, so the Treasurer
// or the Secretary can have different work every year.
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { DUTY_STATUS_OPTIONS } from '@/lib/karya/schemas';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ColumnConfig, FieldConfig } from '@/components/admin/types';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.karyaDuties'), robots: { index: false, follow: false } };
}

const COLUMNS: ColumnConfig[] = [
  { name: 'title', label: 'Responsibility' },
  { name: 'member.fullName', label: 'Committee member', hideOnMobile: true },
  { name: 'status', label: 'Status', type: 'badge' },
  { name: 'deadline', label: 'Deadline', type: 'date', hideOnMobile: true },
];

export default async function AdminDutiesPage() {
  // Every current committee member who can be given work.
  const members = isDatabaseConfigured()
    ? await prisma.karyaSamitiMember
        .findMany({
          where: { isDeleted: false },
          select: { id: true, fullName: true, postTitle: true },
          orderBy: [{ displayOrder: 'asc' }, { fullName: 'asc' }],
        })
        .catch(() => [])
    : [];

  const memberOptions = members.map((member) => ({
    value: member.id,
    label: `${member.fullName} — ${member.postTitle}`,
  }));

  const FIELDS: FieldConfig[] = [
    {
      name: 'memberId',
      label: 'Committee member',
      type: 'select',
      required: true,
      options: memberOptions,
      hint:
        memberOptions.length === 0
          ? 'Add a Karya Samiti member first (Karya Samiti page).'
          : 'The duty appears in that person\'s own member panel.',
      section: 'Responsibility',
    },
    {
      name: 'title',
      label: 'Responsibility',
      type: 'text',
      required: true,
      hint: 'Short and clear, e.g. "Keep the monthly fund ledger up to date".',
      section: 'Responsibility',
    },
    {
      name: 'description',
      label: 'What has to be done',
      type: 'textarea',
      section: 'Responsibility',
    },
    {
      name: 'instructions',
      label: 'Private instructions',
      type: 'textarea',
      hint: 'Only this member and the administrators can read this.',
      section: 'Responsibility',
    },
    {
      name: 'deadline',
      label: 'Deadline',
      type: 'date',
      hint: 'Optional.',
      section: 'Progress',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: DUTY_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
      section: 'Progress',
    },
  ];

  return (
    <ResourceManager
      resourceKey="duties"
      entityLabel="Responsibility"
      title="Committee responsibilities"
      description="Assign duties to individual committee members. Each person sees only their own responsibilities in the member panel."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={DUTY_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      statusField="status"
      defaults={{ status: 'PENDING' }}
    />
  );
}
