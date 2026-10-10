// ========================================
// FUND MANAGEMENT - CHARTS
// ========================================
// The charts on the fund dashboard are drawn with plain SVG shapes, created
// right here. There is no chart library to install and nothing to download in
// the browser, which keeps the website fast and the project easy to maintain.
//
// THE FOUR CHARTS
//   1. <CollectionExpenseBars>  - collection and expense side by side per month
//   2. <BalanceTrendLine>       - how the balance moved month after month
//   3. <StatusDonut>            - how many payments are pending / approved / ...
//   4. <SimpleBars>             - used for bank-wise and category breakdowns
//
// Every chart also prints the numbers underneath, so the information is still
// available to somebody who cannot see colours (accessibility).
// ========================================

import { formatMoney } from '@/lib/fund/calc';
import type { Breakdown, MonthlyPoint, StatusSlice } from '@/lib/fund/calc';
import { humanizeStatus, statusTone, TONE_CLASSES } from '@/lib/status-styles';
import { cn } from '@/lib/utils';

// The colours come from the theme (config/theme.ts) through Tailwind classes,
// except inside SVG shapes where a raw colour value is needed.
const BRAND = '#157466';
const ACCENT = '#E4880B';
const DANGER = '#DC2626';

// ========================================
// 1. COLLECTION vs EXPENSE (grouped bars)
// ========================================
export function CollectionExpenseBars({ points }: { points: MonthlyPoint[] }) {
  if (points.length === 0) {
    return <ChartEmpty message="No approved payments or expenses in this period yet." />;
  }

  const max = Math.max(...points.flatMap((p) => [p.collection, p.expense]), 1);
  const height = 220;
  const barWidth = 26;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(points.length * 74, 320)} ${height + 42}`}
        className="h-64 w-full min-w-[320px]"
        role="img"
        aria-label="Chart comparing monthly collections and expenses"
      >
        {/* Horizontal guide lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = height - height * fraction;
          return (
            <g key={fraction}>
              <line x1="0" y1={y} x2="100%" y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text x="0" y={y - 4} fontSize="10" fill="#94A3B8">
                {Math.round(max * fraction)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const groupX = index * 74 + 30;
          const collectionHeight = (point.collection / max) * height;
          const expenseHeight = (point.expense / max) * height;

          return (
            <g key={point.key}>
              <rect
                x={groupX}
                y={height - collectionHeight}
                width={barWidth}
                height={collectionHeight}
                rx="4"
                fill={BRAND}
              >
                <title>{`${point.fullLabel} collection: ${formatMoney(point.collection)}`}</title>
              </rect>
              <rect
                x={groupX + barWidth + 6}
                y={height - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx="4"
                fill={ACCENT}
              >
                <title>{`${point.fullLabel} expense: ${formatMoney(point.expense)}`}</title>
              </rect>
              <text
                x={groupX + barWidth}
                y={height + 18}
                fontSize="11"
                textAnchor="middle"
                fill="#475569"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>

      <ChartLegend
        items={[
          { label: 'Collection', color: BRAND },
          { label: 'Expense', color: ACCENT },
        ]}
      />
    </div>
  );
}

// ========================================
// 2. FUND BALANCE TREND (line)
// ========================================
export function BalanceTrendLine({ points }: { points: MonthlyPoint[] }) {
  if (points.length < 2) {
    return (
      <ChartEmpty message="A trend line appears once there are at least two months of activity." />
    );
  }

  const height = 220;
  const width = Math.max(points.length * 74, 320);
  const values = points.map((p) => p.runningBalance);

  // Include zero so the line stays readable when the balance is negative.
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x = index * 74 + 30;
    const y = height - ((point.runningBalance - min) / span) * height;
    return { x, y, point };
  });

  const linePath = coordinates.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPath = `M${coordinates[0].x},${height} L${linePath.replace(/ /g, ' L')} L${
    coordinates[coordinates.length - 1].x
  },${height} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + 42}`}
        className="h-64 w-full min-w-[320px]"
        role="img"
        aria-label="Chart showing how the fund balance changed over time"
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = height - height * fraction;
          const value = Math.round(min + span * fraction);
          return (
            <g key={fraction}>
              <line x1="0" y1={y} x2="100%" y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text x="0" y={y - 4} fontSize="10" fill="#94A3B8">
                {value}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={BRAND} fillOpacity="0.10" />
        <polyline points={linePath} fill="none" stroke={BRAND} strokeWidth="3" />

        {coordinates.map(({ x, y, point }) => (
          <g key={point.key}>
            <circle cx={x} cy={y} r="4" fill="#ffffff" stroke={BRAND} strokeWidth="3">
              <title>{`${point.fullLabel} balance: ${formatMoney(point.runningBalance)}`}</title>
            </circle>
            <text x={x} y={height + 18} fontSize="11" textAnchor="middle" fill="#475569">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ========================================
// 3. PAYMENT STATUS DISTRIBUTION (donut)
// ========================================
export function StatusDonut({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return <ChartEmpty message="No payments in this period yet." />;
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 200 200" className="h-48 w-48 shrink-0" role="img" aria-label="Payment status distribution">
        {slices.map((slice) => {
          const fraction = slice.count / total;
          const dash = fraction * circumference;

          const segment = (
            <circle
              key={slice.status}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={donutColour(slice.status)}
              strokeWidth="26"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 100 100)"
            >
              <title>{`${humanizeStatus(slice.status)}: ${slice.count} payment(s)`}</title>
            </circle>
          );

          offset += dash;
          return segment;
        })}

        <text x="100" y="96" textAnchor="middle" fontSize="26" fontWeight="600" fill="#0F172A">
          {total}
        </text>
        <text x="100" y="116" textAnchor="middle" fontSize="12" fill="#64748B">
          payments
        </text>
      </svg>

      <ul className="space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.status} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: donutColour(slice.status) }}
              aria-hidden="true"
            />
            <span className="font-medium text-ink-800">{humanizeStatus(slice.status)}</span>
            <span className="text-ink-500">
              {slice.count} · {formatMoney(slice.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function donutColour(status: string): string {
  switch (statusTone(status)) {
    case 'success':
      return '#16A34A';
    case 'warning':
      return ACCENT;
    case 'danger':
      return DANGER;
    case 'info':
      return '#2563EB';
    case 'brand':
      return BRAND;
    default:
      return '#94A3B8';
  }
}

// ========================================
// 4. SIMPLE HORIZONTAL BARS (bank-wise / category-wise)
// ========================================
export function SimpleBars({ rows }: { rows: Breakdown[] }) {
  if (rows.length === 0) {
    return <ChartEmpty message="Nothing to show for this period." />;
  }

  const max = Math.max(...rows.map((row) => row.amount), 1);

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink-800">{row.name}</span>
            <span className="shrink-0 text-ink-600">
              {formatMoney(row.amount)}
              <span className="ml-1 text-xs text-ink-400">({row.count})</span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${Math.max((row.amount / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ========================================
// SMALL SHARED PIECES
// ========================================
function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-600">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-card border border-dashed border-ink-200 bg-ink-50/60 px-4 text-center text-sm text-ink-500">
      {message}
    </div>
  );
}

/** A small coloured chip for a status value (used in the fund tables). */
export function StatusChip({ status }: { status?: string | null }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONE_CLASSES[statusTone(status)],
      )}
    >
      {humanizeStatus(status)}
    </span>
  );
}
