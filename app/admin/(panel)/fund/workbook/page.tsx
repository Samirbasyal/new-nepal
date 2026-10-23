// ========================================
// ADMIN PANEL - FUND WORKBOOK (EXCEL)
// ========================================
// Address: /admin/fund/workbook        (Fund management -> Fund workbook)
//
// WHY THIS PAGE EXISTS
//   The committee keeps a printed workbook beside the website: one row per member
//   for the monthly fund, one sheet for donations, and two summary sheets that add
//   themselves up. It used to be a file on somebody's laptop. Now it lives here,
//   inside Fund management, and any administrator can download a fresh copy.
//
// THE FILE ITSELF
//   public/downloads/janakalyan-monthly-fund-and-donations.xlsx - an EMPTY template:
//   four sheets, all formulas, three example member names and no real figures. It
//   is not connected to the database, so downloading it cannot leak anything.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = {
  title: 'Fund workbook (Excel)',
};

const FILE = '/downloads/janakalyan-monthly-fund-and-donations.xlsx';

const SHEETS = [
  {
    name: 'Monthly Fund Record',
    detail: 'One row per member, one column per Nepali month (Baisakh to Chaitra), and a TOTAL that adds itself up.',
  },
  {
    name: 'Donation Record',
    detail: 'Donor, phone, email, purpose, payment method, amount and status - with filters, dropdowns and colour by status.',
  },
  {
    name: 'Monthly Fund Summary',
    detail: 'Members, collected, expected, outstanding, paid and unpaid counts, month by month and the yearly total.',
  },
  {
    name: 'Donation Summary',
    detail: 'Approved, pending and rejected totals, month by month, purpose by purpose and donor by donor.',
  },
];

export default function FundWorkbookPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900">Fund workbook (Excel)</h1>
        <p className="mt-1 text-sm text-ink-500">
          The committee workbook, ready to fill in. Formulas are already in place, so you only type the
          amounts.
        </p>
      </header>

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Icon name="file-text" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">
                Janakalyan Samata Yuwa Club - Monthly Fund and Donations
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                Excel workbook (.xlsx) · 4 sheets · works in Excel, LibreOffice and Google Sheets
              </p>
            </div>
          </div>

          <a href={FILE} download className="btn btn-primary">
            <Icon name="download" className="h-4 w-4" />
            Download the workbook
          </a>
        </div>

        <ul className="mt-6 space-y-3 border-t border-ink-100 pt-5">
          {SHEETS.map((sheet) => (
            <li key={sheet.name} className="flex gap-3">
              <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-ink-900">{sheet.name}</p>
                <p className="text-xs leading-relaxed text-ink-600">{sheet.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-bold text-ink-900">How to use it</h2>
        <ol className="mt-3 space-y-2 text-sm text-ink-700">
          <li>
            <span className="font-semibold">1.</span> Download the file and save it on the office computer
            with the year in the name, for example <em>Fund 2082-2083.xlsx</em>.
          </li>
          <li>
            <span className="font-semibold">2.</span> On the first sheet, replace the three example names
            with the real members. Rows can be added - the totals follow automatically.
          </li>
          <li>
            <span className="font-semibold">3.</span> Type the amount each member paid in that member&apos;s
            month cell. Leave the cell empty when nothing was paid - it turns amber by itself.
          </li>
          <li>
            <span className="font-semibold">4.</span> Record donations on the second sheet. Only rows marked
            <span className="font-semibold"> Approved</span> are counted as confirmed money.
          </li>
          <li>
            <span className="font-semibold">5.</span> The two summary sheets look after themselves - nothing
            is typed on them.
          </li>
        </ol>

        <p className="mt-4 rounded-lg bg-ink-50 p-3 text-xs leading-relaxed text-ink-600">
          The workbook is separate from the website on purpose: it is a paper record, and the website
          remains the live one. Downloading it never changes anything here.
        </p>
      </section>

      <p className="text-xs text-ink-500">
        Looking for the live figures instead?{' '}
        <Link href="/admin/fund" className="font-semibold text-brand-700 hover:underline">
          Open the fund dashboard
        </Link>
        .
      </p>
    </div>
  );
}
