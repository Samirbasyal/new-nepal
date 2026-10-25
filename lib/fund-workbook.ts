// ========================================
// THE FUND WORKBOOK, BUILT FROM THE WEBSITE'S OWN DATA
// ========================================
// This is the whole point of the download living inside the panel: the file is
// made on the server, from the rows already in the database, at the moment an
// administrator asks for it. Nothing is typed twice, and the workbook can never
// disagree with the fund screens.
//
// FOUR SHEETS
//   1. Monthly Fund Record   members x Baisakh..Chaitra, verified payments only
//   2. Donation Record       every donation, with its status
//   3. Monthly Fund Summary  collected, expected, outstanding, paid/unpaid
//   4. Donation Summary      approved / pending / rejected, by month and purpose
//
// A payment is bucketed into the Bikram Sambat month it was MADE in, so a payment
// on 14 April lands in Baisakh even though April is a Gregorian month.
// ========================================

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { toNepaliDate } from '@/lib/nepali-date';

const MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

const GREEN = 'FF0E5B45';
const GREEN_LIGHT = 'FFE7F3EE';
const YELLOW = 'FFFFF6D8';

const MONEY = '#,##0';
const THIN = { style: 'thin' as const, color: { argb: 'FFBFCFC8' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function headline(sheet: ExcelJS.Worksheet, text: string, span: number) {
  sheet.mergeCells(1, 1, 1, span);
  const cell = sheet.getCell(1, 1);
  cell.value = text;
  cell.font = { bold: true, size: 15, color: { argb: GREEN } };
}

function headerRow(sheet: ExcelJS.Worksheet, row: number, labels: string[]) {
  labels.forEach((label, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER;
  });
  sheet.getRow(row).height = 28;
}

export async function buildFundWorkbook(fiscalYearBs: number): Promise<Buffer> {
  const [members, payments, donations] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'MEMBER' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, phone: true },
    }),
    // A deleted payment is not money the club holds. Without isDeleted:false a
    // row the office had already removed would still be added into the yearly
    // grid, and the workbook would disagree with every screen in the panel.
    prisma.fundPayment.findMany({
      where: { status: 'VERIFIED', isDeleted: false },
      select: { memberId: true, amount: true, paymentDate: true },
    }),
    prisma.donation.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        donorName: true,
        donorPhone: true,
        donorEmail: true,
        purpose: true,
        method: true,
        amount: true,
        status: true,
        remarks: true,
        createdAt: true,
      },
    }),
  ]);

  // ---------- payments into BS year + month ----------
  const grid = new Map<string, number[]>();
  for (const member of members) grid.set(member.id, new Array(12).fill(0));

  for (const payment of payments) {
    const bs = toNepaliDate(payment.paymentDate);
    if (!bs) continue;
    const [yearText, monthText] = bs.iso.split('-');
    if (Number(yearText) !== fiscalYearBs) continue;
    const row = grid.get(payment.memberId);
    if (!row) continue;
    row[Number(monthText) - 1] += payment.amount;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Janakalyan Samata Yuwa Club';
  workbook.created = new Date();

  // ============================================================
  // 1. MONTHLY FUND RECORD
  // ============================================================
  const fund = workbook.addWorksheet('Monthly Fund Record', { views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }] });
  headline(fund, 'Janakalyan Samata Yuwa Club - Monthly Membership Fund', 14);
  fund.getCell(2, 1).value = `Fiscal year ${fiscalYearBs}/${(fiscalYearBs + 1).toString().slice(-2)} - verified payments only`;
  fund.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF5A6B64' } };
  fund.getCell(3, 1).value = 'Each cell is what that member actually paid in that Nepali month.';
  fund.getCell(3, 1).font = { italic: true, size: 9, color: { argb: 'FF8A9A93' } };

  headerRow(fund, 4, ['Member Name', ...MONTHS, 'TOTAL']);

  members.forEach((member, index) => {
    const rowNumber = 5 + index;
    const nameCell = fund.getCell(rowNumber, 1);
    nameCell.value = member.name || member.email || 'Member';
    nameCell.border = BORDER;

    const amounts = grid.get(member.id) ?? new Array(12).fill(0);
    amounts.forEach((amount, monthIndex) => {
      const cell = fund.getCell(rowNumber, 2 + monthIndex);
      cell.value = amount > 0 ? amount : null;
      cell.numFmt = MONEY;
      cell.border = BORDER;
      cell.alignment = { horizontal: 'center' };
      if (amount === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } };
    });

    const total = fund.getCell(rowNumber, 14);
    total.value = { formula: `SUM(B${rowNumber}:M${rowNumber})` };
    total.numFmt = MONEY;
    total.font = { bold: true };
    total.border = BORDER;
    total.alignment = { horizontal: 'center' };
  });

  const lastMemberRow = 4 + members.length;
  const totalRow = lastMemberRow + 1;
  fund.getCell(totalRow, 1).value = 'TOTAL COLLECTED';
  for (let column = 2; column <= 14; column += 1) {
    const letter = String.fromCharCode(64 + column);
    const cell = fund.getCell(totalRow, column);
    cell.value = { formula: `SUM(${letter}5:${letter}${lastMemberRow})` };
    cell.numFmt = MONEY;
    cell.font = { bold: true };
    cell.border = BORDER;
    cell.alignment = { horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_LIGHT } };
  }
  fund.getCell(totalRow, 1).font = { bold: true };
  fund.getCell(totalRow, 1).border = BORDER;
  fund.getCell(totalRow, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_LIGHT } };
  fund.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, lastMemberRow), column: 14 } };
  fund.getColumn(1).width = 30;
  for (let column = 2; column <= 14; column += 1) fund.getColumn(column).width = 11;

  // ============================================================
  // 2. DONATION RECORD
  // ============================================================
  const donation = workbook.addWorksheet('Donation Record', { views: [{ state: 'frozen', xSplit: 4, ySplit: 4 }] });
  headline(donation, 'Janakalyan Samata Yuwa Club - Donation Record', 9);
  donation.getCell(2, 1).value = 'Only Approved donations count as money received.';
  donation.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF5A6B64' } };

  headerRow(donation, 4, [
    'S.N.', 'English Date', 'Nepali Date', 'Donor Name',
    'Phone', 'Purpose', 'Method', 'Amount (NPR)', 'Status',
  ]);

  donations.forEach((row, index) => {
    const rowNumber = 5 + index;
    const values = [
      index + 1,
      row.createdAt,
      toNepaliDate(row.createdAt)?.full ?? '',
      row.donorName,
      row.donorPhone ?? '',
      row.purpose ?? 'General',
      row.method,
      row.amount,
      row.status,
    ];
    values.forEach((value, columnIndex) => {
      const cell = donation.getCell(rowNumber, columnIndex + 1);
      cell.value = value as ExcelJS.CellValue;
      cell.border = BORDER;
      if (columnIndex === 1) cell.numFmt = 'yyyy-mm-dd';
      if (columnIndex === 7) cell.numFmt = MONEY;
      if (columnIndex === 8) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: row.status === 'VERIFIED' ? 'FFE7F3EE' : row.status === 'REJECTED' ? 'FFFDE2E1' : 'FFFEF3C7' },
        };
      }
    });
  });

  const donationTotalRow = 4 + donations.length + 2;
  donation.getCell(donationTotalRow, 7).value = 'Approved';
  donation.getCell(donationTotalRow + 1, 7).value = 'Pending';
  donation.getCell(donationTotalRow + 2, 7).value = 'Rejected';
  const lastDonationRow = 4 + donations.length;
  ['VERIFIED', 'PENDING', 'REJECTED'].forEach((status, index) => {
    const cell = donation.getCell(donationTotalRow + index, 8);
    cell.value = { formula: `SUMIF(I5:I${lastDonationRow},"${status}",H5:H${lastDonationRow})` };
    cell.numFmt = MONEY;
    cell.font = { bold: true };
    cell.border = BORDER;
    donation.getCell(donationTotalRow + index, 7).font = { bold: true };
    donation.getCell(donationTotalRow + index, 7).border = BORDER;
  });

  donation.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, lastDonationRow), column: 9 } };
  donation.getColumn(1).width = 6;
  donation.getColumn(2).width = 13;
  donation.getColumn(3).width = 20;
  donation.getColumn(4).width = 26;
  donation.getColumn(5).width = 15;
  donation.getColumn(6).width = 22;
  donation.getColumn(7).width = 16;
  donation.getColumn(8).width = 14;
  donation.getColumn(9).width = 13;

  // ============================================================
  // 3. MONTHLY FUND SUMMARY
  // ============================================================
  const summary = workbook.addWorksheet('Monthly Fund Summary');
  headline(summary, `Monthly Fund Summary - ${fiscalYearBs}/${(fiscalYearBs + 1).toString().slice(-2)}`, 3);

  const monthTotals = MONTHS.map((_, monthIndex) =>
    members.reduce((sum, member) => sum + (grid.get(member.id)?.[monthIndex] ?? 0), 0),
  );
  const collected = monthTotals.reduce((sum, value) => sum + value, 0);
  const expected = members.length * 12 * 20;
  const paidMembers = members.filter((member) => (grid.get(member.id) ?? []).some((amount) => amount > 0)).length;

  const metrics: [string, number | string][] = [
    ['Total registered members', members.length],
    ['Total monthly fund collected', collected],
    ['Expected fund (members x 12 x NPR 20)', expected],
    ['Outstanding / unpaid fund', Math.max(0, expected - collected)],
    ['Members who paid something', paidMembers],
    ['Members who paid nothing', members.length - paidMembers],
  ];

  headerRow(summary, 3, ['Measure', 'Value']);
  metrics.forEach(([label, value], index) => {
    const rowNumber = 4 + index;
    summary.getCell(rowNumber, 1).value = label;
    summary.getCell(rowNumber, 1).border = BORDER;
    const cell = summary.getCell(rowNumber, 2);
    cell.value = value;
    cell.border = BORDER;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center' };
    if (typeof value === 'number' && index > 0 && index < 4) cell.numFmt = MONEY;
  });

  const monthStart = 12;
  headerRow(summary, monthStart, ['Month', 'Collected (NPR)']);
  MONTHS.forEach((month, index) => {
    const rowNumber = monthStart + 1 + index;
    summary.getCell(rowNumber, 1).value = month;
    summary.getCell(rowNumber, 1).border = BORDER;
    const cell = summary.getCell(rowNumber, 2);
    cell.value = monthTotals[index];
    cell.numFmt = MONEY;
    cell.border = BORDER;
    cell.alignment = { horizontal: 'center' };
  });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 20;

  // ============================================================
  // 4. DONATION SUMMARY
  // ============================================================
  const donationSummary = workbook.addWorksheet('Donation Summary');
  headline(donationSummary, 'Donation Summary', 3);

  const approved = donations.filter((row) => row.status === 'VERIFIED');
  const approvedTotal = approved.reduce((sum, row) => sum + row.amount, 0);
  const pendingTotal = donations.filter((row) => row.status === 'PENDING').reduce((sum, row) => sum + row.amount, 0);
  const rejectedTotal = donations.filter((row) => row.status === 'REJECTED').reduce((sum, row) => sum + row.amount, 0);

  headerRow(donationSummary, 3, ['Measure', 'Value']);
  const donationMetrics: [string, number][] = [
    ['Total donations recorded', donations.reduce((sum, row) => sum + row.amount, 0)],
    ['Approved (confirmed)', approvedTotal],
    ['Pending', pendingTotal],
    ['Rejected', rejectedTotal],
    ['Number of donations', donations.length],
  ];
  donationMetrics.forEach(([label, value], index) => {
    const rowNumber = 4 + index;
    donationSummary.getCell(rowNumber, 1).value = label;
    donationSummary.getCell(rowNumber, 1).border = BORDER;
    const cell = donationSummary.getCell(rowNumber, 2);
    cell.value = value;
    cell.border = BORDER;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center' };
    if (index < 4) cell.numFmt = MONEY;
  });

  const monthRow = 11;
  headerRow(donationSummary, monthRow, ['Nepali month', 'Approved (NPR)']);
  MONTHS.forEach((month, index) => {
    const rowNumber = monthRow + 1 + index;
    const total = approved.reduce((sum, row) => {
      const bs = toNepaliDate(row.createdAt);
      if (!bs) return sum;
      return bs.iso.startsWith(`${fiscalYearBs}-${String(index + 1).padStart(2, '0')}`) ? sum + row.amount : sum;
    }, 0);
    donationSummary.getCell(rowNumber, 1).value = month;
    donationSummary.getCell(rowNumber, 1).border = BORDER;
    const cell = donationSummary.getCell(rowNumber, 2);
    cell.value = total;
    cell.numFmt = MONEY;
    cell.border = BORDER;
    cell.alignment = { horizontal: 'center' };
  });

  donationSummary.getColumn(1).width = 34;
  donationSummary.getColumn(2).width = 20;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
