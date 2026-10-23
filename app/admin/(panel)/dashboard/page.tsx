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
import { LogoutButton } from '@/components/layout/LogoutButton';
import { nepaliDate } from '@/lib/nepali-date';
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
    heroPhoto: null as string | null,
    share: { fund: 0, donations: 0, expenses: 0 },
    months: [] as { key: string; label: string; fund: number; donations: number; expenses: number }[],
    recentDonations: [] as {
      id: string;
      donorName: string;
      amount: number;
      purpose: string | null;
      status: string;
      date: string;
    iso: string;
    }[],
  };

  if (!isDatabaseConfigured()) return empty;

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const seriesStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const heroPhoto = await prisma.galleryImage
      .findFirst({ where: { isPublished: true }, orderBy: { createdAt: 'desc' }, select: { imageUrl: true } })
      .then((row) => row?.imageUrl ?? null)
      .catch(() => null);

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

    const lived = donationTotal + fundTotal + expenseTotal;
    const pct = (value: number) => (lived > 0 ? Math.round((value / lived) * 100) : 0);

    return {
      heroPhoto,
      share: { fund: pct(fundTotal), donations: pct(donationTotal), expenses: pct(expenseTotal) },
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
      iso: row.createdAt.toISOString(),
      })),
    };
  } catch {
    return empty;
  }
}

function delta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 'new this month' : '-';
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change >= 0 ? '+' : ''}${change}% vs last month`;
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
          THE HEADLINE
          ======================================== */}
      <section className="relative isolate overflow-hidden rounded-2xl bg-[#0a3b2c] shadow-sm">
        {money.heroPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={money.heroPhoto}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[#06251c]/95 via-[#06251c]/75 to-[#06251c]/20" />

        <div className="relative p-6 sm:p-8 lg:p-10">
          <p className="font-display text-lg italic text-accent-300">Welcome to</p>
          <h2 className="mt-1 max-w-lg font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            {organization.name}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">
            Together we build a stronger, fairer and brighter community.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent-400 px-3.5 py-1.5 text-xs font-bold text-[#0a3b2c]">
            <Icon name="map-pin" className="h-3.5 w-3.5" />
            Bajhang, Khaptad Chhanna-3
          </span>
        </div>
      </section>

      {/* ========================================
          FIVE CARDS
          ======================================== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {[
          {
            label: 'Monthly fund',
            value: `Rs. ${formatNumber(money.fundThisMonth)}`,
            delta: delta(money.fundThisMonth, money.fundLastMonth),
            icon: 'banknote' as IconName,
            href: '/admin/fund',
            tone: 'bg-emerald-100 text-emerald-700',
          },
          {
            label: 'Total members',
            value: formatNumber(counts.members),
            delta: `${counts.admins} admin`,
            icon: 'users' as IconName,
            href: '/admin/member-management',
            tone: 'bg-sky-100 text-sky-700',
          },
          {
            label: 'Total donations',
            value: `Rs. ${formatNumber(money.donationTotal)}`,
            delta: delta(money.donationsThisMonth, money.donationsLastMonth),
            icon: 'heart' as IconName,
            href: '/admin/donations',
            tone: 'bg-amber-100 text-amber-700',
          },
          {
            label: 'Total expenses',
            value: `Rs. ${formatNumber(money.expenseTotal)}`,
            delta: delta(money.expensesThisMonth, money.expensesLastMonth),
            icon: 'file-text' as IconName,
            href: '/admin/expenses',
            tone: 'bg-violet-100 text-violet-700',
          },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md"
          >
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
              <Icon name={card.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[11px] font-medium text-ink-500">{card.label}</span>
              <span className="mt-0.5 block truncate text-lg font-bold leading-tight text-ink-900">
                {card.value}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
              <Icon name="trending-up" className="h-3 w-3" />
              {card.delta}
            </span>
          </Link>
        ))}

        {/* the way out, last - as asked */}
        <div className="card flex flex-col justify-between gap-3 p-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Icon name="logout" className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-medium text-ink-500">Sign out</span>
          <LogoutButton className="w-full rounded-btn bg-brand-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-800" />
        </div>
      </div>

      {/* ========================================
          CHART + SUMMARY
          ======================================== */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Icon name="chart" className="h-4 w-4 text-brand-600" />
              Monthly fund overview
            </h2>
            <span className="rounded-md border border-ink-200 px-2 py-1 text-[11px] text-ink-600">
              Last 6 months
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-44 flex-1 items-end justify-between gap-2">
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

            {/* donut */}
            <div className="flex shrink-0 flex-col items-center gap-3 border-t border-ink-100 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <svg viewBox="0 0 42 42" className="h-28 w-28 -rotate-90">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef2f7" strokeWidth="6" />
                <circle
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="none"
                  stroke="#15803d"
                  strokeWidth="6"
                  strokeDasharray={`${money.share.fund} ${100 - money.share.fund}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="6"
                  strokeDasharray={`${money.share.donations} ${100 - money.share.donations}`}
                  strokeDashoffset={-money.share.fund}
                />
                <circle
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="6"
                  strokeDasharray={`${money.share.expenses} ${100 - money.share.expenses}`}
                  strokeDashoffset={-(money.share.fund + money.share.donations)}
                />
              </svg>
              <div className="text-center">
                <p className="text-[11px] text-ink-500">Total funds</p>
                <p className="text-sm font-bold text-ink-900">
                  Rs. {formatNumber(money.donationTotal + money.fundTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 border-t border-ink-100 pt-3 text-[11px] text-ink-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-600" /> Member fund {money.share.fund}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Donations {money.share.donations}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-400" /> Expenses {money.share.expenses}%
            </span>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Icon name="banknote" className="h-4 w-4 text-brand-600" />
            Donation and fund summary
          </h2>

          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between border-b border-ink-100 pb-3">
              <span className="text-ink-600">Total donated</span>
              <span className="font-bold text-ink-900">Rs. {formatNumber(money.donationTotal)}</span>
            </li>
            <li className="flex items-center justify-between border-b border-ink-100 pb-3">
              <span className="text-ink-600">Total fund</span>
              <span className="font-bold text-ink-900">Rs. {formatNumber(money.fundTotal)}</span>
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

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 grid-cols-3 gap-0.5 rounded-md bg-ink-900 p-1">
                {Array.from({ length: 9 }).map((_, index) => (
                  <span
                    key={index}
                    className={index % 3 === 0 || index === 4 ? 'rounded-[1px] bg-white' : 'rounded-[1px] bg-ink-900'}
                  />
                ))}
              </span>
              <span>
                <span className="block text-xs font-semibold text-ink-800">eWallet / Bank QR</span>
                <span className="block text-[11px] text-ink-500">Available for donations</span>
              </span>
            </div>
            <Link
              href="/admin/donations"
              className="rounded-btn bg-brand-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-800"
            >
              View QR
            </Link>
          </div>
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
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-ink-400">
                    <th className="pb-2 font-semibold">Donor</th>
                    <th className="pb-2 font-semibold">Amount</th>
                    <th className="pb-2 font-semibold">Purpose</th>
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {money.recentDonations.map((row) => (
                    <tr key={row.id} className="border-t border-ink-100">
                      <td className="py-2 font-medium text-ink-900">{row.donorName}</td>
                      <td className="py-2 font-semibold text-ink-900">Rs. {formatNumber(row.amount)}</td>
                      <td className="py-2 text-ink-600">{row.purpose ?? 'General'}</td>
                      <td className="py-2 text-ink-500">
                        {row.date}
                        {nepaliDate(row.iso) ? (
                          <span className="block text-[10px] text-ink-400">{nepaliDate(row.iso)}</span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            row.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.status === 'REJECTED'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              { label: 'Add program', href: '/admin/programs', icon: 'layers' as IconName, tone: 'bg-sky-50 text-sky-700' },
              { label: 'Add news', href: '/admin/news', icon: 'megaphone' as IconName, tone: 'bg-violet-50 text-violet-700' },
              { label: 'Add member', href: '/admin/members', icon: 'user-plus' as IconName, tone: 'bg-emerald-50 text-emerald-700' },
              { label: 'Add donation', href: '/admin/donations', icon: 'heart' as IconName, tone: 'bg-amber-50 text-amber-700' },
              { label: 'Upload gallery', href: '/admin/gallery', icon: 'upload' as IconName, tone: 'bg-sky-50 text-sky-700' },
              { label: 'View reports', href: '/admin/fund/reports', icon: 'chart' as IconName, tone: 'bg-emerald-50 text-emerald-700' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-[11px] font-semibold text-ink-700 transition-transform hover:-translate-y-0.5 ${action.tone}`}
              >
                <Icon name={action.icon} className="h-5 w-5" />
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ========================================
          CLOSING STRIP
          ======================================== */}
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#0a3b2c] px-5 py-3 text-white">
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <Icon name="leaf" className="h-4 w-4 text-accent-300" />
          Small help makes a big change!
        </span>
        <span className="font-display text-sm italic text-accent-300">Thank You!</span>
      </section>

      {/* ========================================
          DATABASE NOT CONNECTED
          ======================================== */}
      {!isDatabaseConfigured() ? (
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
