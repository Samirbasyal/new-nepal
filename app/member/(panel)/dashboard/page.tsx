// ========================================
// MEMBER DASHBOARD - THE FIRST SCREEN AFTER SIGNING IN
// ========================================
// Address: /member/dashboard
//
// WHAT A MEMBER SEES HERE, IN THIS ORDER
//   1. a greeting strip with their name, post and membership status
//   2. four numbers: open tasks, permanent duties, fund status, unread alerts
//   3. this month's performance (score + rank), if the office has published it
//   4. quick access to every page of the panel
//   5. the newest notices, programmes and events from the club
//
// WHOSE DATA
//   Only the signed-in member's own. Every query below is limited to the session
//   user's id, or to PUBLISHED public content. A member can never see another
//   member's private information on this page.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
import { requireMember } from '@/lib/auth/guards';
import { StatusBadge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { getEvents, getNewsPosts, getPrograms } from '@/lib/data/public';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'member.dashboard'), robots: { index: false, follow: false } };
}

const QUICK_LINKS: { label: string; href: string; icon: IconName }[] = [
  { label: 'My profile', href: '/member/profile', icon: 'user' },
  { label: 'My tasks', href: '/member/tasks', icon: 'check-circle' },
  { label: 'My responsibilities', href: '/member/duties', icon: 'shield-check' },
  { label: 'My performance', href: '/member/performance', icon: 'chart' },
  { label: 'Monthly fund', href: '/member/fund', icon: 'banknote' },
  { label: 'Pay fund', href: '/member/fund/pay', icon: 'upload' },
  { label: 'Fund history', href: '/member/fund/history', icon: 'list' },
  { label: 'My loans', href: '/member/loans', icon: 'briefcase' },
  { label: 'Messages', href: '/member/messages', icon: 'mail' },
  { label: 'My notes', href: '/member/notes', icon: 'file-text' },
  { label: 'Notices', href: '/news?type=NOTICE', icon: 'megaphone' },
  { label: 'Programs', href: '/programs', icon: 'layers' },
];

function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function MemberDashboardPage() {
  const user = await requireMember();
  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [profile, tasks, dutyCount, roleDutyCount, unread, evaluation, latestPayment, notices, programs, events] =
    await Promise.all([
      isDatabaseConfigured()
        ? prisma.memberProfile.findUnique({ where: { userId: user.id } }).catch(() => null)
        : Promise.resolve(null),

      isDatabaseConfigured()
        ? prisma.task
            .findMany({
              where: { assignedToId: user.id, periodMonth: month },
              orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
            })
            .catch(() => [])
        : Promise.resolve([]),

      isDatabaseConfigured()
        ? prisma.memberResponsibility
            .count({ where: { memberProfile: { userId: user.id }, isActive: true } })
            .catch(() => 0)
        : Promise.resolve(0),

      isDatabaseConfigured()
        ? prisma.committeeRoleDuty
            .count({ where: { isActive: true, memberUserId: user.id } })
            .catch(() => 0)
        : Promise.resolve(0),

      isDatabaseConfigured()
        ? prisma.notification
            .count({ where: { userId: user.id, readAt: null } })
            .catch(() => 0)
        : Promise.resolve(0),

      isDatabaseConfigured()
        ? prisma.performanceEvaluation
            .findFirst({
              where: { memberProfile: { userId: user.id }, status: 'PUBLISHED' },
              orderBy: { periodMonth: 'desc' },
            })
            .catch(() => null)
        : Promise.resolve(null),

      isDatabaseConfigured()
        ? prisma.fundPayment
            .findFirst({
              where: { memberId: user.id, paymentDate: { gte: monthStart() } },
              orderBy: { paymentDate: 'desc' },
              select: { status: true, amount: true },
            })
            .catch(() => null)
        : Promise.resolve(null),

      getNewsPosts({ type: 'NOTICE', pageSize: 3 }),
      getPrograms({ pageSize: 3 }),
      getEvents({ upcomingOnly: true, pageSize: 3 }),
    ]);

  const firstName = user.name.split(' ')[0] || user.name;
  const status = profile?.status ?? 'PENDING';
  const openTasks = tasks.filter((task) => task.status !== 'DONE').length;
  const doneTasks = tasks.filter((task) => task.status === 'DONE').length;
  const duties = dutyCount + roleDutyCount;

  const fundStatus = !latestPayment
    ? { label: 'Not paid yet', tone: 'text-amber-700', href: '/member/fund/pay' }
    : latestPayment.status === 'VERIFIED'
      ? { label: 'Up to date', tone: 'text-emerald-700', href: '/member/fund' }
      : latestPayment.status === 'PENDING'
        ? { label: 'Waiting for approval', tone: 'text-amber-700', href: '/member/fund/history' }
        : { label: 'Needs attention', tone: 'text-red-700', href: '/member/fund/history' };

  const score = evaluation?.overall ?? null;
  const ring = score === null ? 0 : Math.max(0, Math.min(100, score * 10));

  return (
    <div className="space-y-5">
      {/* ========================================
          GREETING
          ======================================== */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#126b50] via-[#0d5540] to-[#0a3b2c] px-5 py-6 text-white sm:px-7 sm:py-7">
        <svg
          aria-hidden="true"
          viewBox="0 0 400 160"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 opacity-25"
          preserveAspectRatio="none"
        >
          <path d="M0 130 L60 60 L100 100 L150 40 L200 110 L250 65 L300 120 L400 45 L400 160 L0 160 Z" fill="#ffffff" />
        </svg>

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/70">
            Welcome back
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Hello, {firstName}</h1>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-emerald-50/80">
            Keep going - your contribution matters to our community.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
              <Icon name="users" className="h-3.5 w-3.5" />
              {profile?.designation ?? 'Member'}
            </span>
            <StatusBadge status={status} />
          </div>
        </div>
      </section>

      {/* ========================================
          FOUR NUMBERS
          ======================================== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          href="/member/tasks"
          icon="check-circle"
          label="Tasks this month"
          value={String(openTasks).padStart(2, '0')}
          hint={`${doneTasks} finished`}
          tone="emerald"
        />
        <StatCard
          href="/member/duties"
          icon="shield-check"
          label="Responsibilities"
          value={String(duties).padStart(2, '0')}
          hint="Permanent"
          tone="sky"
        />
        <StatCard
          href={fundStatus.href}
          icon="banknote"
          label="Fund status"
          value={fundStatus.label}
          hint="This month"
          tone="amber"
          small
        />
        <StatCard
          href="/member/notifications"
          icon="bell"
          label="Notifications"
          value={String(unread).padStart(2, '0')}
          hint={unread === 0 ? 'All read' : 'Unread'}
          tone="violet"
        />
      </div>

      {/* ========================================
          PERFORMANCE
          ======================================== */}
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Icon name="chart" className="h-4 w-4 text-brand-600" />
            My performance
          </h2>
          <Link href="/member/performance" className="text-xs font-semibold text-brand-700 hover:underline">
            View details
          </Link>
        </div>

        {score === null ? (
          <p className="mt-3 text-sm text-ink-500">
            No result has been published yet. Your score and rank appear here after the committee
            publishes the month.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <Ring value={ring} label={`${Math.round(score)}%`} />
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Your score for {evaluation?.periodMonth}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {score.toFixed(1)} out of 100
                {evaluation?.rank ? ` · rank ${evaluation.rank}` : ''}
              </p>
              {evaluation?.remarks ? (
                <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-600">
                  {evaluation.remarks}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {/* ========================================
          QUICK ACCESS
          ======================================== */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink-900">Quick access</h2>
          <span className="text-[11px] text-ink-400">Everything in the panel</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-800"
            >
              <Icon name={item.icon} className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ========================================
          FROM THE CLUB
          ======================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Latest notices" href="/news?type=NOTICE" empty="No notices yet.">
          {notices.rows.map((post) => (
            <Row key={post.id} href={`/news/${post.slug}`} title={post.title} meta={formatDate(post.publishedAt)} />
          ))}
        </Panel>

        <Panel title="Programmes" href="/programs" empty="No programmes yet.">
          {programs.rows.map((program) => (
            <Row key={program.id} href={`/programs/${program.slug}`} title={program.title} meta={program.location ?? ''} />
          ))}
        </Panel>

        <Panel title="Upcoming events" href="/events" empty="Nothing scheduled.">
          {events.rows.map((event) => (
            <Row
              key={event.id}
              href={`/events/${event.slug}`}
              title={event.title}
              meta={event.startsAt ? formatDate(event.startsAt) : ''}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}

// ========================================
// SMALL PIECES
// ========================================

function StatCard({
  href,
  icon,
  label,
  value,
  hint,
  tone,
  small = false,
}: {
  href: string;
  icon: IconName;
  label: string;
  value: string;
  hint: string;
  tone: 'emerald' | 'sky' | 'amber' | 'violet';
  small?: boolean;
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  } as const;

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-500">
          {label}
        </span>
        <span className={`mt-0.5 block font-bold text-ink-900 ${small ? 'text-sm' : 'text-xl'}`}>
          {value}
        </span>
        <span className="mt-0.5 block text-[11px] text-ink-400">{hint}</span>
      </span>
      <Icon
        name="chevron-right"
        className="mt-1 h-4 w-4 shrink-0 text-ink-300 group-hover:text-brand-600"
      />
    </Link>
  );
}

function Ring({ value, label }: { value: number; label: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#e6efe9" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#15803d"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink-900">
        {label}
      </span>
    </div>
  );
}

function Panel({
  title,
  href,
  empty,
  children,
}: {
  title: string;
  href: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
        <Link href={href} className="text-[11px] font-semibold text-brand-700 hover:underline">
          All
        </Link>
      </div>
      {hasChildren ? <ul className="mt-2 divide-y divide-ink-100">{children}</ul> : (
        <p className="mt-3 text-xs text-ink-500">{empty}</p>
      )}
    </section>
  );
}

function Row({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <li>
      <Link href={href} className="block py-2.5 hover:text-brand-700">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-ink-800">{title}</p>
        {meta ? <p className="mt-0.5 text-[11px] text-ink-400">{meta}</p> : null}
      </Link>
    </li>
  );
}
