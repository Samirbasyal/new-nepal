// ========================================
// BADGE COMPONENT (SMALL COLOURED LABELS)
// ========================================
// Used for statuses like "Ongoing", "Completed", "Upcoming", "New".
//
// HOW TO USE
//   <Badge tone="success">Completed</Badge>
//   <StatusBadge status="ONGOING" />        // colour chosen automatically
//
// The colour that matches each status is defined in lib/status-styles.ts.
// ========================================

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TONE_CLASSES, humanizeStatus, statusTone, type BadgeTone } from '@/lib/status-styles';

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A badge that understands status values.
 * Example: <StatusBadge status="IN_PROGRESS" /> shows "In progress" in blue.
 */
export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return null;
  return (
    <Badge tone={statusTone(status)} className={className}>
      {humanizeStatus(status)}
    </Badge>
  );
}
