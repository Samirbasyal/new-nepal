// ========================================
// ADMIN PANEL
// This code controls the Activity Log page.
// ========================================
// Address: /admin/activity
//
// A short "who did what and when" history:
//   who signed in, who added a program, who deleted a news article...
//
// The log is READ-ONLY. It is written automatically by lib/audit.ts whenever
// an administrator creates, edits or deletes something, so the record cannot
// be edited afterwards by mistake.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { Icon } from '@/components/ui/Icon';
import type { ColumnConfig } from '@/components/admin/types';

export const metadata: Metadata = {
  title: 'Activity log',
  robots: { index: false, follow: false },
};

const COLUMNS: ColumnConfig[] = [
  { name: 'createdAt', label: 'When', type: 'datetime' },
  { name: 'actorName', label: 'Who' },
  { name: 'action', label: 'Action', type: 'badge' },
  { name: 'entity', label: 'Section', hideOnMobile: true },
  { name: 'detail', label: 'Details', type: 'longtext', hideOnMobile: true },
];

export default function AdminActivityPage() {
  return (
    <div className="space-y-6">
      {/* ========================================
          EXPLANATION
          ======================================== */}
      <div className="rounded-card border border-ink-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Icon name="info" className="h-4 w-4 text-brand-600" />
          About this log
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-600">
          Entries are added automatically when an administrator signs in, adds, changes or deletes
          something. The log cannot be edited here, which is what makes it useful for checking what
          happened. Search it below, or filter by action.
        </p>
      </div>

      {/* ========================================
          THE READ-ONLY TABLE
          ======================================== */}
      <ResourceManager
        resourceKey="activity"
        entityLabel="Activity entry"
        title="Activity log"
        description="A read-only history of administrator actions."
        // A read-only section needs no form fields, so no "Add new" and no pencil.
        fields={[]}
        columns={COLUMNS}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        pageSize={20}
      />

      <p className="text-xs text-ink-500">
        Looking for something specific?{' '}
        <Link href="/admin/dashboard" className="font-medium text-brand-700 hover:underline">
          Go back to the dashboard
        </Link>{' '}
        for the overview and quick actions.
      </p>
    </div>
  );
}
