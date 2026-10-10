// ========================================
// API - FUND REPORTS AND CSV EXPORT
// ========================================
// Address: GET /api/admin/fund/reports?report=collections&preset=month&format=csv
//
// Every report is built from the SAME money rules as the dashboard, because it
// uses lib/fund/calc.ts. A report can therefore never disagree with the
// balance shown on the fund dashboard.
//
// ADMIN ONLY
//   requireAdminApi() runs first, so a member calling this address receives
//   403 Forbidden.
//
// CSV
//   format=csv returns a downloadable spreadsheet file. Every value is escaped
//   properly, so a name containing a comma or a quote cannot break the file.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { reportQuerySchema } from '@/lib/fund/schemas';
import {
  getBankWiseCollection,
  getExpenseCategoryBreakdown,
  getFundSummary,
  monthLabel,
  resolveDateRange,
} from '@/lib/fund/calc';

export const dynamic = 'force-dynamic';

type ReportRow = Record<string, string | number | null>;

/** Escape one CSV value. */
function csvValue(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // Wrap in quotes when the text contains a comma, a quote or a new line.
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows: ReportRow[]): string {
  if (rows.length === 0) return 'No data for the selected filters\r\n';

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => csvValue(row[header] ?? null)).join(','));
  }

  // Excel opens a CSV with a BOM correctly, including Nepali characters.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) {
    return fail('The database is not set up yet.', 503);
  }

  const url = new URL(request.url);
  const parsed = reportQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return fail('Unknown report.', 422);
  }

  const query = parsed.data;
  const range = resolveDateRange(query.preset, query.from, query.to);

  // Shared filters for the payment based reports.
  const paymentWhere = {
    isDeleted: false,
    ...(query.status ? { status: query.status } : {}),
    ...(query.bankId ? { bankId: query.bankId } : {}),
    ...(query.categoryId ? { fundCategoryId: query.categoryId } : {}),
    ...(query.memberId ? { memberId: query.memberId } : {}),
    ...(range.from || range.to
      ? {
          paymentDate: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          },
        }
      : {}),
  };

  let rows: ReportRow[] = [];
  let title = 'Report';

  try {
    switch (query.report) {
      // ========================================
      // COLLECTIONS (approved only - the real money received)
      // ========================================
      case 'collections': {
        title = 'Monthly collection report';
        const payments = await prisma.fundPayment.findMany({
          where: { ...paymentWhere, status: 'APPROVED' },
          orderBy: { paymentDate: 'asc' },
          include: { member: { select: { name: true, email: true } }, fundCategory: { select: { name: true } } },
        });

        rows = payments.map((payment) => ({
          Date: payment.paymentDate.toISOString().slice(0, 10),
          Month: payment.periodMonth ? monthLabel(payment.periodMonth) : '',
          Member: payment.member?.name ?? '',
          Email: payment.member?.email ?? '',
          Amount: payment.amount,
          Bank: payment.bankNameSnapshot ?? '',
          'Transaction ID': payment.transactionId,
          Category: payment.fundCategory?.name ?? '',
        }));
        break;
      }

      // ========================================
      // EXPENSES (approved only)
      // ========================================
      case 'expenses': {
        title = 'Monthly expense report';
        const expenses = await prisma.expense.findMany({
          where: {
            isDeleted: false,
            status: 'APPROVED',
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(range.from || range.to
              ? {
                  expenseDate: {
                    ...(range.from ? { gte: range.from } : {}),
                    ...(range.to ? { lte: range.to } : {}),
                  },
                }
              : {}),
          },
          orderBy: { expenseDate: 'asc' },
          include: { category: { select: { name: true } }, addedBy: { select: { name: true } } },
        });

        rows = expenses.map((expense) => ({
          Date: expense.expenseDate.toISOString().slice(0, 10),
          Title: expense.title,
          Category: expense.category?.name ?? '',
          Amount: expense.amount,
          'Paid to': expense.paidTo ?? '',
          Method: expense.method,
          Reference: expense.referenceNumber ?? '',
          'Added by': expense.addedBy?.name ?? '',
        }));
        break;
      }

      // ========================================
      // STILL WAITING FOR VERIFICATION
      // ========================================
      case 'pending-payments': {
        title = 'Pending payment report';
        const payments = await prisma.fundPayment.findMany({
          where: { ...paymentWhere, status: 'PENDING' },
          orderBy: { submittedAt: 'asc' },
          include: { member: { select: { name: true, email: true, phone: true } } },
        });

        rows = payments.map((payment) => ({
          Submitted: payment.submittedAt.toISOString().slice(0, 10),
          Member: payment.member?.name ?? '',
          Phone: payment.member?.phone ?? '',
          Amount: payment.amount,
          'Payment date': payment.paymentDate.toISOString().slice(0, 10),
          Bank: payment.bankNameSnapshot ?? '',
          'Transaction ID': payment.transactionId,
        }));
        break;
      }

      // ========================================
      // EVERY TRANSACTION, WHATEVER ITS STATUS
      // ========================================
      case 'transactions': {
        title = 'Date-wise transaction report';
        const payments = await prisma.fundPayment.findMany({
          where: paymentWhere,
          orderBy: { paymentDate: 'asc' },
          include: { member: { select: { name: true } } },
        });

        rows = payments.map((payment) => ({
          Date: payment.paymentDate.toISOString().slice(0, 10),
          Member: payment.member?.name ?? '',
          Amount: payment.amount,
          Status: payment.status,
          Bank: payment.bankNameSnapshot ?? '',
          'Transaction ID': payment.transactionId,
          Note: payment.reviewNote ?? '',
        }));
        break;
      }

      // ========================================
      // COLLECTION BY BANK
      // ========================================
      case 'bank-wise': {
        title = 'Bank-wise collection report';
        const breakdown = await getBankWiseCollection(range);

        rows = breakdown.map((row) => ({
          Bank: row.name,
          Payments: row.count,
          Amount: row.amount,
        }));
        break;
      }

      // ========================================
      // SPENDING BY CATEGORY
      // ========================================
      case 'category-wise': {
        title = 'Category-wise expense report';
        const breakdown = await getExpenseCategoryBreakdown(range);

        rows = breakdown.map((row) => ({
          Category: row.name,
          Expenses: row.count,
          Amount: row.amount,
        }));
        break;
      }

      // ========================================
      // ONE ROW PER MEMBER
      // ========================================
      case 'member-contributions':
      case 'member-payments': {
        title = 'Member-wise contribution report';
        const payments = await prisma.fundPayment.findMany({
          where: { ...paymentWhere, status: 'APPROVED' },
          include: { member: { select: { id: true, name: true, email: true } } },
        });

        const buckets = new Map<string, ReportRow>();

        for (const payment of payments) {
          const key = payment.memberId;
          const existing = buckets.get(key) ?? {
            Member: payment.member?.name ?? '',
            Email: payment.member?.email ?? '',
            Payments: 0,
            'Total contributed': 0,
            'Last payment': '',
          };

          existing.Payments = Number(existing.Payments) + 1;
          existing['Total contributed'] = Number(existing['Total contributed']) + payment.amount;

          const date = payment.paymentDate.toISOString().slice(0, 10);
          if (!existing['Last payment'] || date > String(existing['Last payment'])) {
            existing['Last payment'] = date;
          }

          buckets.set(key, existing);
        }

        rows = [...buckets.values()].sort(
          (a, b) => Number(b['Total contributed']) - Number(a['Total contributed']),
        );
        break;
      }

      // ========================================
      // THE BALANCE ITSELF
      // ========================================
      default: {
        title = 'Fund balance report';
        const summary = await getFundSummary(range);

        rows = [
          { Item: 'Total fund collected (approved)', Amount: summary.collection },
          { Item: 'Total fund spent (approved)', Amount: summary.expense },
          { Item: 'Balance for the period', Amount: summary.balance },
          { Item: 'Balance all time', Amount: summary.allTimeBalance },
          { Item: 'Pending payments (not counted)', Amount: summary.pendingAmount },
          { Item: 'Expected / upcoming fund', Amount: summary.expectedFund },
        ];
        break;
      }
    }
  } catch (error) {
    console.error('[fund] report failed:', error);
    return fail('The report could not be built. Please try again.', 500);
  }

  // ========================================
  // ANSWER
  // ========================================
  if (query.format === 'csv') {
    const filename = `${query.report}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(toCsv(rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return ok({ title, range: range.label, report: query.report, rows });
}
