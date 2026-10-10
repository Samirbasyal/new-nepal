// ========================================
// EMPTY STATE COMPONENT
// ========================================
// Shown when a section has no content yet.
//
// IMPORTANT: this project never invents example content or statistics.
// While the organization is still adding its real information, pages show a
// friendly empty state instead of fake data.
// ========================================

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon = 'folder',
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  /** A button or link shown under the message. */
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-ink-300 bg-ink-50/60 text-center',
        compact ? 'px-6 py-10' : 'px-6 py-14 sm:py-16',
        className,
      )}
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-ink-200">
        <Icon name={icon} className="h-6 w-6" />
      </span>

      <h3 className="text-base font-semibold text-ink-900">{title}</h3>

      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-600">{description}</p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * The standard message shown on public pages whose content is managed from the
 * Admin Panel and has not been added yet.
 */
export function AdminManagedEmpty({ label }: { label: string }) {
  return (
    <EmptyState
      icon="info"
      title={`${label} will appear here`}
      description="This section is managed from the Admin Panel. Sign in as an administrator and add the first entry - no code changes are needed."
    />
  );
}
