// ========================================
// ADMIN PANEL - PAYMENT SETTINGS AND QR CODES
// ========================================
// Address: /admin/fund/banks
//
// WHAT THIS SCREEN CONTROLS
//   Every way a member can pay the monthly contribution:
//     - bank accounts (bank name, account holder, number, branch)
//     - eSewa wallet (name, eSewa ID)
//     - Khalti wallet (name, Khalti ID)
//     - anything else the organization uses
//
//   Each account can carry a QR CODE PICTURE. That is how most members actually
//   pay: they open "Pay fund" in their own panel, choose the account and scan the
//   QR with their phone.
//
// THE TWO PARTS OF THIS PAGE
//   1. The QR codes panel: every account with the picture it shows, at a glance.
//      Anything missing a QR is called out, so nothing is forgotten.
//   2. The table below: add, edit, switch off or remove an account.
//
// WHERE THE QR APPEARS TO MEMBERS
//   /member/fund/pay - chosen account, its details AND its QR picture, next to
//   the box where the member types the transaction number.
// ========================================

import type { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/Section';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { paymentAccountTypeLabel } from '@/lib/constants';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { FieldConfig, ColumnConfig } from '@/components/admin/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payment settings and QR codes',
  robots: { index: false, follow: false },
};

// ========================================
// THE FORM
// ========================================
const FIELDS: FieldConfig[] = [
  {
    name: 'methodType',
    label: 'How do members pay into this?',
    type: 'select',
    span: 1,
    required: true,
    section: 'Which service',
    options: [
      { value: 'BANK', label: 'Bank account' },
      { value: 'ESEWA', label: 'eSewa wallet' },
      { value: 'KHALTI', label: 'Khalti wallet' },
      { value: 'OTHER', label: 'Other' },
    ],
    hint: 'This decides whether it is listed under banks or under wallets.',
  },
  {
    name: 'name',
    label: 'Name shown to members',
    type: 'text',
    span: 1,
    required: true,
    section: 'Which service',
    hint: 'For example "NIC Asia Bank" or "eSewa".',
  },

  // ---------- account details ----------
  {
    name: 'accountName',
    label: 'Account holder name',
    type: 'text',
    span: 1,
    required: true,
    section: 'Account details',
  },
  {
    name: 'accountNumber',
    label: 'Account number / wallet ID',
    type: 'text',
    span: 1,
    required: true,
    section: 'Account details',
    hint: 'For a wallet this is the mobile number or the wallet ID.',
  },
  {
    name: 'accountLabel',
    label: 'What to call the number above',
    type: 'text',
    span: 1,
    section: 'Account details',
    hint: 'For example "Account number" or "eSewa ID".',
  },
  {
    name: 'branch',
    label: 'Branch',
    type: 'text',
    span: 1,
    section: 'Account details',
    hint: 'Not used for a wallet.',
  },

  // ---------- QR code ----------
  {
    name: 'qrImageUrl',
    label: 'Payment QR code',
    type: 'image',
    span: 2,
    uploadable: true,
    section: 'QR code',
    hint: 'Upload the QR picture or paste a link. It appears next to the account details on the member payment page - this is how most members pay.',
  },

  // ---------- instructions, order, visibility ----------
  {
    name: 'instructions',
    label: 'Payment instructions',
    type: 'textarea',
    span: 2,
    section: 'Instructions and display',
    hint: 'Shown under the account details, for example "Please write your name in the remarks."',
  },
  {
    name: 'isDefault',
    label: 'Recommend this account',
    type: 'checkbox',
    span: 1,
    section: 'Instructions and display',
    hint: 'It is listed first and marked "(recommended)". Mark only one account.',
  },
  {
    name: 'isActive',
    label: 'Show to members',
    type: 'checkbox',
    span: 1,
    section: 'Instructions and display',
    hint: 'Switch off to stop accepting payments into this account.',
  },
  { name: 'sortOrder', label: 'Sort order', type: 'number', span: 1, section: 'Instructions and display', hint: 'Lower numbers first.' },
];

// ========================================
// THE TABLE
// ========================================
const COLUMNS: ColumnConfig[] = [
  { name: 'methodType', label: 'Method', type: 'badge' },
  { name: 'name', label: 'Name' },
  { name: 'accountNumber', label: 'Number / ID' },
  { name: 'isDefault', label: 'Recommended', type: 'boolean', hideOnMobile: true },
  { name: 'qrImageUrl', label: 'QR', type: 'image', hideOnMobile: true },
  { name: 'isActive', label: 'Active', type: 'boolean' },
];

const TYPE_COLOURS: Record<string, string> = {
  BANK: 'bg-blue-50 text-blue-700 ring-blue-200',
  ESEWA: 'bg-green-50 text-green-700 ring-green-200',
  KHALTI: 'bg-purple-50 text-purple-700 ring-purple-200',
  OTHER: 'bg-ink-100 text-ink-600 ring-ink-200',
};

export default async function AdminPaymentSettingsPage() {
  // ---------- every account, so the QR codes can be seen at a glance ----------
  let accounts: {
    id: string;
    name: string;
    methodType: string;
    accountNumber: string;
    accountLabel: string | null;
    qrImageUrl: string | null;
    isActive: boolean;
    isDefault: boolean;
  }[] = [];

  if (isDatabaseConfigured()) {
    try {
      accounts = await prisma.bank.findMany({
        orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          methodType: true,
          accountNumber: true,
          accountLabel: true,
          qrImageUrl: true,
          isActive: true,
          isDefault: true,
        },
      });
    } catch (error) {
      console.error('[payment settings] could not load the accounts:', error);
    }
  }

  const shown = accounts.filter((account) => account.isActive);
  const missingQr = shown.filter((account) => !account.qrImageUrl);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Fund management"
        icon="qr-code"
        title="Payment settings and QR codes"
        description="Every way a member can pay: bank accounts, eSewa, Khalti and their QR codes. Only switched-on accounts are shown to members."
      />

      {/* ========================================
          THE QR CODES
          ======================================== */}
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">
              QR codes shown to members ({shown.length})
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              A member opens <strong>Pay fund</strong> in their own panel, picks an account and scans
              this picture with their phone. To change a QR, press <strong>Edit</strong> on the row
              below and upload a new picture.
            </p>
          </div>

          {missingQr.length > 0 ? (
            <p className="rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              {missingQr.length} account(s) still have no QR code: {missingQr.map((a) => a.name).join(', ')}
            </p>
          ) : shown.length > 0 ? (
            <p className="rounded-card border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
              Every account has a QR code.
            </p>
          ) : null}
        </div>

        {shown.length === 0 ? (
          <div className="mt-5 rounded-card border border-dashed border-ink-300 p-6 text-center">
            <Icon name="qr-code" className="mx-auto h-8 w-8 text-ink-300" />
            <h3 className="mt-3 font-display text-base font-bold text-ink-900">
              No payment account yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
              Press <strong>Add</strong> on the table below and choose whether it is a bank account, an
              eSewa wallet or a Khalti wallet. Upload the QR picture there, and members will be able to
              scan it straight away.
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((account) => (
              <li key={account.id} className="rounded-card border border-ink-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        TYPE_COLOURS[account.methodType] ?? TYPE_COLOURS.OTHER
                      }`}
                    >
                      {paymentAccountTypeLabel(account.methodType)}
                    </span>
                    <p className="mt-2 truncate font-semibold text-ink-900">{account.name}</p>
                    <p className="text-xs text-ink-500">
                      {account.accountLabel ?? 'Number'}: {account.accountNumber}
                    </p>
                  </div>

                  {account.isDefault ? (
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      Recommended
                    </span>
                  ) : null}
                </div>

                {account.qrImageUrl ? (
                  <div className="mt-3 rounded-card bg-ink-50 p-3">
                    {/* The QR is shown exactly as the member will see it. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={account.qrImageUrl}
                      alt={`Payment QR code for ${account.name}`}
                      className="mx-auto h-40 w-40 rounded-card bg-white object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex h-[10.5rem] items-center justify-center rounded-card border border-dashed border-amber-300 bg-amber-50 p-3 text-center">
                    <p className="text-xs text-amber-800">
                      No QR code yet.
                      <br />
                      Press <strong>Edit</strong> on the row below and upload one.
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ========================================
          ADD / EDIT / SWITCH OFF
          ======================================== */}
      <div id="payment-accounts">
        <ResourceManager
          resourceKey="banks"
          title="Accounts members can pay into"
          description="Add a bank account, an eSewa or Khalti wallet, or any other way of paying. Upload the QR picture in the form. A removed account is kept out of the member page but is never deleted while records point at it - switch it off instead."
          entityLabel="Payment account"
          fields={FIELDS}
          columns={COLUMNS}
          publishField="isActive"
          defaults={{ isActive: true, sortOrder: 0, methodType: 'BANK', isDefault: false }}
        />
      </div>

      <p className="text-xs text-ink-500">
        What the member sees: <strong>Member panel → Pay fund</strong> shows the account details, the
        QR code and the box to type the transaction number. Payments then wait for the office to
        verify them on <strong>Fund management → Payment verification</strong>.
      </p>
    </div>
  );
}
