// ========================================
// NEPALI DATE FIELD (वि.सं. मिति)
// ========================================
// A real Bikram Sambat calendar, not an English calendar wearing a Nepali label.
//
// WHAT IT DOES
//   The office picks a day from a BS month grid - बैशाख २०८२, day 15 - and the
//   field shows both that and the Gregorian date it corresponds to. What gets
//   saved is still the Gregorian date, because that is what the database, the
//   reports and the sorting already understand. Nothing about storage changes;
//   only what the person sees and clicks.
//
// WHY THE DAY GRID IS BUILT THIS WAY
//   BS months are 29 to 32 days and the lengths differ by year, so they cannot be
//   calculated. We ask the library for each day: build the date, and keep it only
//   if the month comes back unchanged. That is slower than a table but it is
//   always right, including the years where a month has 32 days.
//
// EDITING AN OLD RECORD
//   A saved Gregorian date is converted back to BS on the way in, so opening a
//   member who joined in 2075 shows 2075 - not today.
// ========================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NepaliDate from 'nepali-date-converter';
import { Icon } from '@/components/ui/Icon';

const MONTHS_BS = [
  'बैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भदौ',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पुष',
  'माघ',
  'फाल्गुन',
  'चैत',
];

const MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

const WEEKDAYS = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

/** The AD date as YYYY-MM-DD, read in local time so the day never slips. */
function toIsoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** How many days the given BS month actually has. */
function daysInBsMonth(year: number, monthIndex: number): number {
  let last = 29;
  for (let day = 30; day <= 32; day += 1) {
    try {
      const probe = new NepaliDate(year, monthIndex, day);
      if (probe.getMonth() === monthIndex && probe.getDate() === day) last = day;
      else break;
    } catch {
      break;
    }
  }
  return last;
}

/** Which weekday (0 = Sunday) the first of a BS month falls on. */
function firstWeekdayOfBsMonth(year: number, monthIndex: number): number {
  try {
    return new NepaliDate(year, monthIndex, 1).toJsDate().getDay();
  } catch {
    return 0;
  }
}

type Parts = { year: number; monthIndex: number; day: number };

function partsFromAd(value: string | null | undefined): Parts | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const bs = new NepaliDate(date);
    return { year: bs.getYear(), monthIndex: bs.getMonth(), day: bs.getDate() };
  } catch {
    return null;
  }
}

function todayParts(): Parts {
  const bs = new NepaliDate(new Date());
  return { year: bs.getYear(), monthIndex: bs.getMonth(), day: bs.getDate() };
}

function adFromParts(parts: Parts): Date | null {
  try {
    return new NepaliDate(parts.year, parts.monthIndex, parts.day).toJsDate();
  } catch {
    return null;
  }
}

export function NepaliDateField({
  name,
  label,
  value,
  onChange,
  required = false,
  error,
  hint,
  compact = false,
  submitName,
}: {
  name: string;
  label?: string;
  /** Gregorian ISO date (YYYY-MM-DD) - the same shape the API already expects. */
  value: string | null | undefined;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  /**
   * For date filters that sit in a row beside other controls: no label above,
   * no hint, a button the same height as the inputs around it.
   */
  compact?: boolean;
  /**
   * For plain HTML forms that submit with GET. A hidden input carries the same
   * Gregorian value the browser used to send, so the page's query string and
   * every server-side filter keep working untouched.
   */
  submitName?: string;
}) {
  const selected = useMemo(() => partsFromAd(value), [value]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ year: number; monthIndex: number }>(() => {
    const start = selected ?? todayParts();
    return { year: start.year, monthIndex: start.monthIndex };
  });
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Keep the grid on the month of the saved date when an old record is opened.
  useEffect(() => {
    if (selected) setView({ year: selected.year, monthIndex: selected.monthIndex });
  }, [selected?.year, selected?.monthIndex]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const totalDays = daysInBsMonth(view.year, view.monthIndex);
  const leadingBlanks = firstWeekdayOfBsMonth(view.year, view.monthIndex);

  function shift(months: number) {
    const next = view.monthIndex + months;
    const year = view.year + Math.floor(next / 12);
    const monthIndex = ((next % 12) + 12) % 12;
    setView({ year, monthIndex });
  }

  function pick(day: number) {
    const date = adFromParts({ year: view.year, monthIndex: view.monthIndex, day });
    if (!date) return;
    onChange(toIsoDay(date));
    setOpen(false);
  }

  const english = value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const nepaliShown = selected ? `${selected.day} ${MONTHS_BS[selected.monthIndex]} ${selected.year}` : '';

  return (
    <div className="relative" ref={boxRef}>
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-ink-800" htmlFor={`${name}-bs`}>
          {label} <span className="text-ink-500">(नेपाली मिति / BS)</span>
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </label>
      ) : null}

      {submitName ? <input type="hidden" name={submitName} value={value ?? ''} /> : null}

      <button
        id={`${name}-bs`}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? undefined : `${name} - नेपाली मिति`}
        className={`input flex w-full items-center justify-between gap-3 text-left ${
          compact ? 'py-2 text-sm' : ''
        } ${error ? 'border-red-400' : ''}`}
      >
        <span className="flex min-w-0 items-baseline gap-2">
          {nepaliShown ? (
            <>
              <span className={`font-semibold text-ink-900 ${compact ? 'text-xs' : ''}`}>{nepaliShown}</span>
              {compact ? null : <span className="truncate text-xs text-ink-500">({english} AD)</span>}
            </>
          ) : (
            <span className="text-ink-400">{compact ? 'मिति / Date' : 'मिति छान्नुहोस् / Choose a date'}</span>
          )}
        </span>
        <Icon name="calendar" className="h-4 w-4 shrink-0 text-ink-400" />
      </button>

      {value && !compact ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="mt-1 text-xs text-ink-500 underline hover:text-ink-700"
        >
          Clear the date
        </button>
      ) : null}

      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}

      {open ? (
        <div
          role="dialog"
          aria-label="Nepali calendar"
          className="absolute z-40 mt-2 w-[19rem] rounded-2xl border border-ink-200 bg-white p-3 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="rounded-lg p-1.5 text-ink-600 transition hover:bg-ink-100"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={view.monthIndex}
                onChange={(event) => setView({ ...view, monthIndex: Number(event.target.value) })}
                className="rounded-lg border border-ink-200 px-2 py-1 text-sm font-semibold"
                aria-label="Month"
              >
                {MONTHS_BS.map((month, index) => (
                  <option key={month} value={index}>
                    {month} ({MONTHS_EN[index]})
                  </option>
                ))}
              </select>

              <select
                value={view.year}
                onChange={(event) => setView({ ...view, year: Number(event.target.value) })}
                className="rounded-lg border border-ink-200 px-2 py-1 text-sm font-semibold"
                aria-label="Year"
              >
                {Array.from({ length: 121 }, (_, index) => 2000 + index).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="rounded-lg p-1.5 text-ink-600 transition hover:bg-ink-100"
            >
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-ink-500">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
            {Array.from({ length: leadingBlanks }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}

            {Array.from({ length: totalDays }, (_, index) => index + 1).map((day) => {
              const isSelected =
                selected?.year === view.year && selected.monthIndex === view.monthIndex && selected.day === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  className={`rounded-lg py-1.5 text-sm transition ${
                    isSelected
                      ? 'bg-brand-600 font-bold text-white'
                      : 'text-ink-800 hover:bg-brand-50 hover:text-brand-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                const now = todayParts();
                setView({ year: now.year, monthIndex: now.monthIndex });
                onChange(toIsoDay(new Date()));
                setOpen(false);
              }}
              className="font-semibold text-brand-700 hover:underline"
            >
              आज / Today
            </button>
            <span className="text-ink-400">
              {MONTHS_BS[view.monthIndex]} {view.year}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
