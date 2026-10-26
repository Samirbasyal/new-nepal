// ========================================
// FROM / TO, CHOSEN IN BIKRAM SAMBAT
// ========================================
// Several admin pages filter a report with two plain date boxes inside an
// ordinary <form> that submits with GET. Those pages are server components, so
// they cannot hold the picker's state themselves - this small client wrapper
// does it for them.
//
// The form still receives ?from=YYYY-MM-DD&to=YYYY-MM-DD, which is exactly what
// it received before, so every server-side query and report is unchanged.
// ========================================

'use client';

import { useState } from 'react';
import { NepaliDateField } from '@/components/ui/NepaliDateField';

export function DateRangeFilter({
  from,
  to,
  fromLabel = 'From',
  toLabel = 'To',
}: {
  /** Gregorian YYYY-MM-DD, as read from the current query string. */
  from?: string | null;
  to?: string | null;
  fromLabel?: string;
  toLabel?: string;
}) {
  const [start, setStart] = useState(from ?? '');
  const [end, setEnd] = useState(to ?? '');

  return (
    <>
      <label className="block">
        <span className="label">{fromLabel}</span>
        <NepaliDateField
          name="filterFrom"
          label={undefined}
          compact
          submitName="from"
          value={start}
          onChange={setStart}
        />
      </label>

      <label className="block">
        <span className="label">{toLabel}</span>
        <NepaliDateField
          name="filterTo"
          label={undefined}
          compact
          submitName="to"
          value={end}
          onChange={setEnd}
        />
      </label>
    </>
  );
}
