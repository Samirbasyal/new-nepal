import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - EXPENSES
// ========================================
// Address: /admin/fund/expenses
//
// Record and manage everything the organization spends.
//
// APPROVAL RULE (enforced on the server, not just in this screen)
//   A saved expense starts as PENDING and is NOT subtracted from the balance.
//   Only a Super Administrator can approve it, and they do that from the
//   decisions API. The "status" field is deliberately missing from the form
//   below, so nobody can approve money by typing a word into a box.
//
// Hiding an expense keeps the record (soft delete) so the history stays whole.
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { FieldConfig, ColumnConfig } from '@/components/admin/types';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { EXPENSE_STATUS_OPTIONS, EXPENSE_METHOD_OPTIONS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.expenses'), robots: { index: false, follow: false } };
}

async function getCategoryOptions() {
  if (!isDatabaseConfigured()) return [];

  const categories = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  });

  return categories.map((category) => ({ value: category.id, label: category.name }));
}

export default async function AdminExpensesPage() {
  const categories = await getCategoryOptions();

  const FIELDS: FieldConfig[] = [
    { name: 'title', label: 'Expense title', type: 'text', required: true, span: 2 },
    {
      name: 'categoryId',
      label: 'Category',
      type: 'select',
      span: 1,
      options: categories,
      hint: 'Manage the list in Fund Management -> Categories.',
    },
    { name: 'amount', label: 'Amount (whole rupees)', type: 'number', required: true, span: 1 },
    { name: 'expenseDate', label: 'Expense date', type: 'nepali-date', required: true, span: 1 },
    {
      name: 'method',
      label: 'Payment method',
      type: 'select',
      span: 1,
      options: EXPENSE_METHOD_OPTIONS,
    },
    { name: 'paidTo', label: 'Paid to / vendor', type: 'text', span: 1 },
    { name: 'referenceNumber', label: 'Reference number', type: 'text', span: 1 },
    { name: 'description', label: 'Description', type: 'textarea', span: 2 },
    {
      name: 'receiptUrl',
      label: 'Bill / receipt',
      type: 'image',
      span: 2,
      uploadable: true,
      hint: 'Attach the bill so the approval is backed by a document.',
    },
  ];

  const COLUMNS: ColumnConfig[] = [
    { name: 'title', label: 'Expense' },
    { name: 'category.name', label: 'Category', hideOnMobile: true },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'expenseDate', label: 'Date', type: 'nepali-date' },
    { name: 'paidTo', label: 'Paid to', hideOnMobile: true },
    { name: 'status', label: 'Status', type: 'badge' },
  ];

  return (
    <ResourceManager
      resourceKey="expenses"
      entityLabel="Expense"
      title="Expenses"
      description="Money spent by the organization. Only approved expenses reduce the fund balance."
      fields={FIELDS}
      columns={COLUMNS}
      statusOptions={EXPENSE_STATUS_OPTIONS}
      publishField="status"
    />
  );
}
