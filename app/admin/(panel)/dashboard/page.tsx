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

export default async function AdminDashboardPage() {
  // ---------- SERVER-SIDE AUTHORIZATION ----------
  const user = await requireAdmin();

  const [counts, activity] = await Promise.all([getCounts(), recentActivity(10)]);

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
    { label: 'Members', value: counts.members, href: '/admin/members', icon: 'users', note: `${counts.admins} admin` },
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
