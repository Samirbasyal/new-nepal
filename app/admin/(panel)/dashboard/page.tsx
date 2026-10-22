// ========================================
// ADMIN PANEL
// This code controls the Admin Dashboard (the overview page).
// ========================================
// Address: /admin/dashboard
//
// EVERY NUMBER ON THIS PAGE IS A REAL COUNT FROM THE DATABASE.
// Nothing here is estimated or invented.
//
//   - how many members, programs, projects, events and articles exist
//   - how many join applications and contact messages are still NEW
//   - which content is still a draft (not published yet)
//   - the most recent actions, from the activity log
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { recentActivity, describeActivity } from '@/lib/audit';
import { Alert } from '@/components/ui/Alert';
import { Icon, type IconName } from '@/components/ui/Icon';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { organization } from '@/config/site';
import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.dashboard'), robots: { index: false, follow: false } };
}

// ========================================
// READ THE REAL COUNTS
// ========================================
async function getCounts() {
  const empty = {
    members: 0,
    admins: 0,
    programs: 0,
    programsDraft: 0,
    projects: 0,
    projectsDraft: 0,
    events: 0,
    eventsDraft: 0,
    news: 0,
    newsDraft: 0,
    photos: 0,
    donors: 0,
    applicationsNew: 0,
    applicationsTotal: 0,
    messagesNew: 0,
    messagesTotal: 0,
    tasksOpen: 0,
    beneficiaries: 0,
  };

  if (!isDatabaseConfigured()) return empty;

  try {
    const [
      members,
      admins,
      programs,
      programsDraft,
      projects,
      projectsDraft,
      events,
      eventsDraft,
      news,
      newsDraft,
      photos,
      donors,
      applicationsNew,
      applicationsTotal,
      messagesNew,
      messagesTotal,
      tasksOpen,
      beneficiaries,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.program.count(),
      prisma.program.count({ where: { isPublished: false } }),
      prisma.project.count(),
      prisma.project.count({ where: { isPublished: false } }),
      prisma.event.count(),
      prisma.event.count({ where: { isPublished: false } }),
      prisma.newsPost.count(),
      prisma.newsPost.count({ where: { isPublished: false } }),
      prisma.galleryImage.count(),
      prisma.donor.count(),
      prisma.joinApplication.count({ where: { status: 'NEW' } }),
      prisma.joinApplication.count(),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.contactMessage.count(),
      prisma.task.count({ where: { status: { not: 'DONE' } } }),
      prisma.beneficiaryCategory.count(),
    ]);

    return {
      members,
      admins,
      programs,
      programsDraft,
      projects,
      projectsDraft,
      events,
      eventsDraft,
      news,
      newsDraft,
      photos,
      donors,
      applicationsNew,
      applicationsTotal,
      messagesNew,
      messagesTotal,
      tasksOpen,
      beneficiaries,
    };
  } catch (error) {
    console.error('[admin dashboard] could not read counts:', error);
    return empty;
  }
}

// ========================================
// THE MONEY, MONTH BY MONTH
// ========================================
// Real rows only: verified member fund payments, verified donations and recorded
// expenses. Nothing is estimated. The dashboard draws the last six months from
// this one function so every number on the page agrees with the others.
async function getMoneyOverview() {
  const empty = {
    fundTotal: 0,
    donationTotal: 0,
    expenseTotal: 0,
    fundThisMonth: 0,
    fundLastMonth: 0,
    donationsThisMonth: 0,
    donationsLastMonth: 0,
    expensesThisMonth: 0,
    expensesLastMonth: 0,
    months: [] as { key: string; label: string; fund: number; donations: number; expenses: number }[],
    recentDonations: [] as {
      id: string;
      donorName: string;
      amount: number;
      purpose: string | null;
      status: string;
      date: string;
    }[],
  };

  if (!isDatabaseConfigured()) return empty;

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const seriesStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [fundRows, donationRows, expenseRows, recent] = await Promise.all([
      prisma.fundPayment.findMany({
        where: { status: 'VERIFIED' },
        select: { amount: true, paymentDate: true },
      }),
      prisma.donation.findMany({
        where: { status: 'VERIFIED' },
        select: { amount: true, createdAt: true, verifiedAt: true },
      }),
      prisma.expense.findMany({ select: { amount: true, expenseDate: true } }),
      prisma.donation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          donorName: true,
          amount: true,
          purpose: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const months: { key: string; label: string; fund: number; donations: number; expenses: number }[] =
      [];
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(seriesStart.getFullYear(), seriesStart.getMonth() + index, 1);
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleString('en-GB', { month: 'short' }),
        fund: 0,
        donations: 0,
        expenses: 0,
      });
    }

    const keyOf = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    let fundTotal = 0;
    let fundThisMonth = 0;
    let fundLastMonth = 0;

    for (const row of fundRows) {
      fundTotal += row.amount;
      const key = keyOf(row.paymentDate);
      const bucket = months.find((month) => month.key === key);
      if (bucket) bucket.fund += row.amount;
      if (row.paymentDate >= monthStart) fundThisMonth += row.amount;
      else if (row.paymentDate >= lastMonthStart) fundLastMonth += row.amount;
    }

    let donationTotal = 0;
    let donationsThisMonth = 0;
    let donationsLastMonth = 0;

    for (const row of donationRows) {
      donationTotal += row.amount;
      const date = row.verifiedAt ?? row.createdAt;
      const key = keyOf(date);
      const bucket = months.find((month) => month.key === key);
      if (bucket) bucket.donations += row.amount;
      if (date >= monthStart) donationsThisMonth += row.amount;
      else if (date >= lastMonthStart) donationsLastMonth += row.amount;
    }

    let expenseTotal = 0;
    let expensesThisMonth = 0;
    let expensesLastMonth = 0;

    for (const row of expenseRows) {
      expenseTotal += row.amount;
      const key = keyOf(row.expenseDate);
      const bucket = months.find((month) => month.key === key);
      if (bucket) bucket.expenses += row.amount;
      if (row.expenseDate >= monthStart) expensesThisMonth += row.amount;
      else if (row.expenseDate >= lastMonthStart) expensesLastMonth += row.amount;
    }

    return {
      fundTotal,
      donationTotal,
      expenseTotal,
      fundThisMonth,
      fundLastMonth,
      donationsThisMonth,
      donationsLastMonth,
      expensesThisMonth,
      expensesLastMonth,
      months,
      recentDonations: recent.map((row) => ({
        id: row.id,
        donorName: row.donorName,
        amount: row.amount,
        purpose: row.purpose,
        status: row.status,
        date: row.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      })),
    };
  } catch {
    return empty;
  }
}

export default async function AdminDashboardPage() {
  // ---------- SERVER-SIDE AUTHORIZATION ----------
  const user = await requireAdmin();

  const [counts, activity, money] = await Promise.all([
    getCounts(),
    recentActivity(10),
    getMoneyOverview(),
  ]);

  const databaseReady = isDatabaseConfigured();

  // ========================================
  // SETUP CHECKLIST
  // Shown while the website is still being set up. It disappears once the
  // first content exists.
  // ========================================
  const setupSteps = [
    {
      done: databaseReady,
      label: 'Connect the database',
      hint: 'Set DATABASE_URL in your .env file (see PROJECT_GUIDE.md).',
    },
    {
      done: counts.admins > 0,
      label: 'Create an administrator account',
      hint: 'Run: npm run admin:create',
    },
    {
      done: counts.programs + counts.projects + counts.events + counts.news > 0,
      label: 'Add your first content',
      hint: 'Start with one program, one project or one news item.',
    },
    {
      done: counts.photos > 0,
      label: 'Add some photos',
      hint: 'Gallery → photos. Only use pictures you have permission to use.',
    },
    {
      done: Boolean(counts.beneficiaries),
      label: 'Describe who you serve',
      hint: 'Beneficiaries → add the groups you work with.',
    },
  ];

  const setupComplete = setupSteps.every((step) => step.done);

  // ========================================
  // THE NUMBER CARDS
  // ========================================
  const cards: {
    label: string;
    value: number;
    href: string;
    icon: IconName;
    note?: string;
    highlight?: boolean;
  }[] = [
    { label: 'Programs', value: counts.programs, href: '/admin/programs', icon: 'layers', note: counts.programsDraft > 0 ? `${counts.programsDraft} draft` : undefined },
    { label: 'Projects & works', value: counts.projects, href: '/admin/projects', icon: 'briefcase', note: counts.projectsDraft > 0 ? `${counts.projectsDraft} draft` : undefined },
    { label: 'Events', value: counts.events, href: '/admin/events', icon: 'calendar', note: counts.eventsDraft > 0 ? `${counts.eventsDraft} draft` : undefined },
    { label: 'News & notices', value: counts.news, href: '/admin/news', icon: 'megaphone', note: counts.newsDraft > 0 ? `${counts.newsDraft} draft` : undefined },
    { label: 'Gallery photos', value: counts.photos, href: '/admin/gallery', icon: 'image' },
    // Straight to the working list (duties, tasks, scores, ranking) rather than the
    // account screen - that is what an administrator opens the dashboard for.
    { label: 'Members', value: counts.members, href: '/admin/member-management', icon: 'users', note: 'duties · tasks · ranking' },
    { label: 'Donors & supporters', value: counts.donors, href: '/admin/donors', icon: 'heart' },
    { label: 'Beneficiary groups', value: counts.beneficiaries, href: '/admin/beneficiaries', icon: 'target' },
    { label: 'Join applications', value: counts.applicationsTotal, href: '/admin/applications', icon: 'user-plus', note: counts.applicationsNew > 0 ? `${counts.applicationsNew} new` : undefined },
    { label: 'Contact messages', value: counts.messagesTotal, href: '/admin/messages', icon: 'mail', note: counts.messagesNew > 0 ? `${counts.messagesNew} new` : undefined },
    { label: 'Open member tasks', value: counts.tasksOpen, href: '/admin/tasks', icon: 'check-circle' },
  ];

  return (
    <div className="space-y-8">
      {/* ========================================
          WELCOME
          ======================================== */}
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Welcome, {user.name}
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          This is the administration area for {organization.name}. Everything you change here
          appears on the public website immediately.
        </p>
      </header>

      {/* ========================================
          THE HEADLINE: WHO WE ARE
          ======================================== */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a3b2c] via-[#0e5b45] to-[#0a3b2c] p-6 text-white shadow-sm sm:p-8">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 bottom-0 h-40 w-72 opacity-25"
          viewBox="0 0 288 160"
          fill="none"
        >
          <path d="M0 160 L70 70 L110 110 L150 55 L210 120 L250 85 L288 130 L288 160 Z" fill="#ffffff" />
        </svg>

        <div className="relative max-w-2xl">
          <p className="font-display text-sm italic text-accent-300">Welcome to</p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">
            {organization.name}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">
            Together we build a stronger, fairer and brighter community.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-400 px-3 py-1 text-xs font-semibold text-[#0a3b2c]">
            <Icon name="map-pin" className="h-3.5 w-3.5" />
            Bajhang, Khaptad Chhanna-3
          </span>
        </div>
      </section>

      {/* ========================================
          FOUR NUMBERS
          ======================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Monthly fund',
            value: `Rs. ${formatNumber(money.fundThisMonth)}`,
            note: `Rs. ${formatNumber(money.fundTotal)} verified in total`,
            icon: 'banknote' as IconName,
            href: '/admin/fund',
            tone: 'bg-emerald-100 text-emerald-700',
          },
          {
            label: 'Total members',
            value: formatNumber(counts.members),
            note: `${counts.admins} administrator${counts.admins === 1 ? '' : 's'}`,
            icon: 'users' as IconName,
            href: '/admin/member-management',
            tone: 'bg-sky-100 text-sky-700',
          },
          {
            label: 'Total donations',
            value: `Rs. ${formatNumber(money.donationTotal)}`,
            note: `Rs. ${formatNumber(money.donationsThisMonth)} this month`,
            icon: 'heart' as IconName,
            href: '/admin/donations',
            tone: 'bg-amber-100 text-amber-700',
          },
          {
            label: 'Total expenses',
            value: `Rs. ${formatNumber(money.expenseTotal)}`,
            note: `Rs. ${formatNumber(money.expensesThisMonth)} this month`,
            icon: 'file-text' as IconName,
            href: '/admin/expenses',
            tone: 'bg-violet-100 text-violet-700',
          },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-md"
          >
            <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
              <Icon name={card.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-ink-500">{card.label}</span>
              <span className="mt-0.5 block truncate text-lg font-bold text-ink-900">{card.value}</span>
              <span className="block truncate text-[11px] text-ink-400">{card.note}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* ========================================
          SIX MONTHS OF MONEY
          ======================================== */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Icon name="chart" className="h-4 w-4 text-brand-600" />
              Monthly fund overview
            </h2>
            <span className="text-xs text-ink-500">Last 6 months</span>
          </div>

          {money.months.length > 0 ? (
            <>
              <div className="mt-6 flex h-44 items-end justify-between gap-2 sm:gap-4">
                {money.months.map((month) => {
                  const max = Math.max(
                    1,
                    ...money.months.map((row) => Math.max(row.fund, row.donations, row.expenses)),
                  );
                  return (
                    <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-36 w-full items-end justify-center gap-1">
                        <span
                          className="w-1/4 rounded-t bg-brand-600"
                          style={{ height: `${Math.max(2, (month.fund / max) * 100)}%` }}
                          title={`Fund Rs. ${formatNumber(month.fund)}`}
                        />
                        <span
                          className="w-1/4 rounded-t bg-sky-500"
                          style={{ height: `${Math.max(2, (month.donations / max) * 100)}%` }}
                          title={`Donations Rs. ${formatNumber(month.donations)}`}
                        />
                        <span
                          className="w-1/4 rounded-t bg-accent-400"
                          style={{ height: `${Math.max(2, (month.expenses / max) * 100)}%` }}
                          title={`Expenses Rs. ${formatNumber(month.expenses)}`}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-ink-500">{month.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-4 border-t border-ink-100 pt-3 text-[11px] text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-600" /> Member fund
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Donations
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent-400" /> Expenses
                </span>
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-ink-500">No money has been recorded yet.</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Icon name="banknote" className="h-4 w-4 text-brand-600" />
            Donation and fund summary
          </h2>

          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between border-b border-ink-100 pb-3">
              <span className="text-ink-600">Total received</span>
              <span className="font-bold text-ink-900">
                Rs. {formatNumber(money.donationTotal + money.fundTotal)}
              </span>
            </li>
            <li className="flex items-center justify-between border-b border-ink-100 pb-3">
              <span className="text-ink-600">Total spent</span>
              <span className="font-bold text-ink-900">Rs. {formatNumber(money.expenseTotal)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-ink-600">Balance in hand</span>
              <span className="font-bold text-brand-700">
                Rs. {formatNumber(money.donationTotal + money.fundTotal - money.expenseTotal)}
              </span>
            </li>
          </ul>

          <Link
            href="/admin/fund/reports"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            Open reports <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      {/* ========================================
          RECENT DONATIONS + QUICK ACTIONS
          ======================================== */}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Icon name="heart" className="h-4 w-4 text-red-500" />
              Recent donations
            </h2>
            <Link href="/admin/donations" className="text-xs font-semibold text-brand-700 hover:underline">
              View all
            </Link>
          </div>

          {money.recentDonations.length > 0 ? (
            <ul className="mt-3 divide-y divide-ink-100">
              {money.recentDonations.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink-900">
                      {row.donorName}
                    </span>
                    <span className="block truncate text-[11px] text-ink-500">
                      {row.purpose ?? 'General fund'} - {row.date}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold text-ink-900">
                      Rs. {formatNumber(row.amount)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase ${
                        row.status === 'VERIFIED'
                          ? 'text-emerald-600'
                          : row.status === 'REJECTED'
                            ? 'text-red-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {row.status}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-500">No donations recorded yet.</p>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Icon name="grid" className="h-4 w-4 text-brand-600" />
              Quick actions
            </h2>
            <Link href="/admin/settings" className="text-xs font-semibold text-brand-700 hover:underline">
              Settings
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: 'Add member', href: '/admin/members', icon: 'user-plus' as IconName },
              { label: 'Add news', href: '/admin/news', icon: 'megaphone' as IconName },
              { label: 'Add program', href: '/admin/programs', icon: 'layers' as IconName },
              { label: 'Upload photo', href: '/admin/gallery', icon: 'image' as IconName },
              { label: 'Record donation', href: '/admin/donations', icon: 'heart' as IconName },
              { label: 'View reports', href: '/admin/fund/reports', icon: 'chart' as IconName },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-200 px-2 py-3 text-center text-[11px] font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
              >
                <Icon name={action.icon} className="h-5 w-5 text-brand-600" />
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      </div>



      {/* ========================================
          DATABASE NOT CONNECTED YET
          ======================================== */}
      {!databaseReady ? (
        <Alert tone="warning" title="The database is not connected yet">
          Open your <code>.env</code> file and set <code>DATABASE_URL</code> to your PostgreSQL
          address, then run <code>npm run db:push</code>. Full instructions are in{' '}
          <strong>PROJECT_GUIDE.md</strong>, section 2.
        </Alert>
      ) : null}

      {/* ========================================
          SETUP CHECKLIST (only while setting up)
          ======================================== */}
      {!setupComplete ? (
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Icon name="sparkles" className="h-5 w-5 text-accent-500" />
            Getting started
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            A short checklist to help you get the website ready.
          </p>

          <ul className="mt-4 space-y-3">
            {setupSteps.map((step) => (
              <li key={step.label} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    step.done ? 'bg-green-100 text-green-700' : 'bg-ink-100 text-ink-400'
                  }`}
                >
                  <Icon name={step.done ? 'check' : 'chevron-right'} className="h-3.5 w-3.5" />
                </span>
                <span>
                  <span
                    className={`block text-sm font-medium ${
                      step.done ? 'text-ink-500 line-through' : 'text-ink-900'
                    }`}
                  >
                    {step.label}
                  </span>
                  {!step.done ? (
                    <span className="block text-xs text-ink-500">{step.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ========================================
          NEW ITEMS THAT NEED ATTENTION
          ======================================== */}
      {counts.applicationsNew + counts.messagesNew > 0 ? (
        <Alert tone="info" title="You have new messages to review">
          <ul className="mt-1 space-y-1">
            {counts.applicationsNew > 0 ? (
              <li>
                <Link href="/admin/applications" className="font-semibold underline">
                  {counts.applicationsNew} new join application
                  {counts.applicationsNew === 1 ? '' : 's'}
                </Link>
              </li>
            ) : null}
            {counts.messagesNew > 0 ? (
              <li>
                <Link href="/admin/messages" className="font-semibold underline">
                  {counts.messagesNew} new contact message{counts.messagesNew === 1 ? '' : 's'}
                </Link>
              </li>
            ) : null}
          </ul>
        </Alert>
      ) : null}

      {/* ========================================
          COUNT CARDS
          ======================================== */}
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-600">
          Your content
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="card card-hover flex flex-col gap-3 p-4"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-brand-50 text-brand-600">
                <Icon name={card.icon} className="h-4 w-4" />
              </span>

              <span>
                <span className="block text-2xl font-bold leading-none text-ink-900">
                  {formatNumber(card.value)}
                </span>
                <span className="mt-1 block text-xs text-ink-600">{card.label}</span>
                {card.note ? (
                  <span className="mt-1 inline-block rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-semibold text-accent-700">
                    {card.note}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ========================================
          QUICK ACTIONS
          ======================================== */}
      <section className="card p-6">
        <h2 className="text-base font-bold text-ink-900">Quick actions</h2>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: 'Add a program', href: '/admin/programs', icon: 'plus' as const },
            { label: 'Add a project', href: '/admin/projects', icon: 'plus' as const },
            { label: 'Add an event', href: '/admin/events', icon: 'plus' as const },
            { label: 'Write news', href: '/admin/news', icon: 'plus' as const },
            { label: 'Upload photos', href: '/admin/gallery', icon: 'image' as const },
            { label: 'Add a member', href: '/admin/members', icon: 'users' as const },
            { label: 'Change contact details', href: '/admin/settings', icon: 'settings' as const },
            { label: 'View the website', href: '/', icon: 'external-link' as const },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-btn border border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              <Icon name={action.icon} className="h-4 w-4 shrink-0" />
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ========================================
          RECENT ACTIVITY
          ======================================== */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Icon name="activity" className="h-5 w-5 text-brand-600" />
            Recent activity
          </h2>

          <Link href="/admin/activity" className="text-sm font-semibold text-brand-700 hover:underline">
            View full log
          </Link>
        </div>

        {activity.length > 0 ? (
          <ul className="mt-4 divide-y divide-ink-100">
            {activity.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 py-2.5 text-sm">
                <span className="font-medium text-ink-800">
                  {entry.actorName || 'System'}
                </span>
                <span className="text-ink-500">{describeActivity(entry.action)}</span>
                <span className="font-medium text-ink-700">{entry.entity}</span>
                {entry.detail ? (
                  <span className="text-ink-500">· {entry.detail}</span>
                ) : null}
                <span className="ml-auto text-xs text-ink-400">
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-500">
            No activity recorded yet. Actions you take in the Admin Panel will be listed here.
          </p>
        )}
      </section>

      {/* ========================================
          SECURITY REMINDER
          ======================================== */}
      <section className="rounded-card border border-ink-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
          <Icon name="shield-check" className="h-5 w-5 text-brand-600" />
          A note about security
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li className="flex gap-2.5">
            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              Every page and API in this panel re-checks your administrator role on the server, so
              a normal member account cannot reach it.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              Passwords are stored only as bcrypt hashes. Nobody can read them, not even you.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              Repeated failed sign-in attempts are temporarily blocked. See auth-notes in
              PROJECT_GUIDE.md.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
