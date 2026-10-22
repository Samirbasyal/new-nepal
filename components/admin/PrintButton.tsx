'use client';

// ========================================
// PRINT BUTTON
// ========================================
// One button, one job: open the browser's print dialog. Kept as a tiny client
// component so the report page itself can stay a server component and talk to
// the database directly.
//
// The report page hides this button (and its own controls) when it is printed,
// with Tailwind's "print:hidden", so the paper carries the table and nothing else.
// ========================================

import { Icon } from '@/components/ui/Icon';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn btn-primary btn-sm print:hidden"
    >
      <Icon name="download" className="h-4 w-4" />
      Print / save as PDF
    </button>
  );
}
