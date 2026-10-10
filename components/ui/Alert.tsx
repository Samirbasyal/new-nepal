// ========================================
// ALERT / MESSAGE BOX
// ========================================
// Shows a message to the user: information, success, warning or error.
// Used for form results and status notices.
//
// HOW TO USE
//   <Alert tone="success">Your message has been sent.</Alert>
//   <Alert tone="error" title="Please fix these problems">{list}</Alert>
// ========================================

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const TONE_STYLES: Record<AlertTone, { box: string; icon: IconName; iconColor: string }> = {
  info: { box: 'bg-blue-50 border-blue-200 text-blue-900', icon: 'info', iconColor: 'text-blue-600' },
  success: {
    box: 'bg-green-50 border-green-200 text-green-900',
    icon: 'check-circle',
    iconColor: 'text-green-600',
  },
  warning: {
    box: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: 'alert',
    iconColor: 'text-amber-600',
  },
  error: { box: 'bg-red-50 border-red-200 text-red-900', icon: 'alert', iconColor: 'text-red-600' },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      // role="alert" makes screen readers announce the message immediately.
      role="alert"
      className={cn('flex gap-3 rounded-card border px-4 py-3.5 text-sm', styles.box, className)}
    >
      <Icon name={styles.icon} className={cn('mt-0.5 h-5 w-5 shrink-0', styles.iconColor)} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-1', 'leading-relaxed')}>{children}</div> : null}
      </div>
    </div>
  );
}
