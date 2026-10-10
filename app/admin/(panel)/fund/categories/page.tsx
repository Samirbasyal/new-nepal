// ========================================
// ADMIN PANEL - FUND & EXPENSE CATEGORIES
// ========================================
// Address: /admin/fund/categories
//
// TWO LISTS ON ONE PAGE
//   1. Fund categories    - what kind of money came in
//                           (Monthly Member Fund, Donation, Event Fund,
//                            Emergency Fund, Charity Fund, Special
//                            Contribution, Other)
//   2. Expense categories - what the money was spent on
//                           (Event, Office, Equipment, Transportation, Food,
//                            Salary, Maintenance, Charity, Emergency, Other)
//
// Adding, renaming and switching off categories can be done freely.
// Deleting a category that is already used by a payment or an expense is
// refused on the server, so historical records always keep their meaning.
// ========================================

import type { Metadata } from 'next';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { FieldConfig, ColumnConfig } from '@/components/admin/types';
import { SectionHeading } from '@/components/ui/Section';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fund categories',
  robots: { index: false, follow: false },
};

const CATEGORY_FIELDS: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, span: 2 },
  { name: 'description', label: 'Description (optional)', type: 'textarea', span: 2 },
  { name: 'isActive', label: 'Available for new records', type: 'checkbox', span: 1 },
  { name: 'sortOrder', label: 'Sort order', type: 'number', span: 1 },
];

const CATEGORY_COLUMNS: ColumnConfig[] = [
  { name: 'name', label: 'Name' },
  { name: 'description', label: 'Description', type: 'longtext', hideOnMobile: true },
  { name: 'isActive', label: 'Active', type: 'boolean' },
];

export default function AdminFundCategoriesPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Fund management"
        title="Fund & expense categories"
        description="Keep the lists tidy so reports are easy to read."
      />

      {/* ========================================
          MONEY IN
          ======================================== */}
      <ResourceManager
        resourceKey="fund-categories"
        entityLabel="Fund category"
        title="Fund categories (money in)"
        description="Used when recording a payment. The Monthly Member Fund category is used automatically for monthly contributions."
        fields={CATEGORY_FIELDS}
        columns={CATEGORY_COLUMNS}
        publishField="isActive"
        defaults={{ isActive: true, sortOrder: 0 }}
      />

      {/* ========================================
          MONEY OUT
          ======================================== */}
      <ResourceManager
        resourceKey="expense-categories"
        entityLabel="Expense category"
        title="Expense categories (money out)"
        description="Used when recording an expense. Reports group spending by these categories."
        fields={CATEGORY_FIELDS}
        columns={CATEGORY_COLUMNS}
        publishField="isActive"
        defaults={{ isActive: true, sortOrder: 0 }}
      />
    </div>
  );
}
