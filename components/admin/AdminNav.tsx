// ========================================
// ADMIN PANEL - SIDEBAR MENU
// ========================================
// The list of sections in the Admin Panel.
//
// To add a new section:
//   1. add it to lib/api/resources.ts
//   2. create the page under app/admin/(panel)/<name>/page.tsx
//   3. add one line to ADMIN_LINKS below
//
// The links are grouped so the menu stays readable.
//
// ========================================
// THE "WAITING" BADGE
// ========================================
// Payment verification is the one screen where somebody has to act: a member has
// paid money and is waiting to be told it was accepted. Nothing used to say so -
// the administrator had to remember to open the queue and look.
//
// The layout counts the waiting payments and passes the number here, and the
// "Payment verification" link shows it. It is only a signpost: the count comes
// from the same query the queue itself uses, and the real decision is still made
// on that page, on the server.
// ========================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PanelNavLink } from '@/components/ui/PanelNavLink';
import { t, tx, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type NavGroup = {
  title: string;
  links: { label: string; href: string; icon: IconName }[];
  /**
   * Show this group only to a Super Administrator.
   *
   * Hiding the link is only a courtesy - it is NOT what protects the pages.
   * The page itself calls requireSuperAdmin() and the API checks the role again
   * (lib/api/crud.ts -> readRoles / writeRoles), so an ordinary administrator
   * who types the address by hand is still refused.
   */
  superAdminOnly?: boolean;
};

/** The link that carries the "payments waiting" badge. */
const VERIFY_HREF = '/admin/fund/pending';

/**
 * The link that carries the "membership requests waiting" badge.
 *
 * The number next to it is the count of PENDING requests, refreshed every half
 * minute from /api/admin/membership-requests/pending-count. It is a signpost, not
 * a permission: the page and every action behind it are guarded on the server.
 */
const REQUESTS_HREF = '/admin/member-requests';

const NAV_GROUPS: NavGroup[] = [
  {
    // ========================================
    // OVERVIEW
    // ========================================
    // The dashboard, plus the notification list (new members, payments waiting
    // to be verified, loan activity, and anything else that needs attention).
    title: 'Overview',
    links: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: 'grid' },
      // ========================================
      // NOTIFICATIONS
      // ========================================
      // New members, payments waiting to be verified, loan activity and other
      // events that need somebody's attention.
      { label: 'Notifications', href: '/admin/notifications', icon: 'bell' },
    ],
  },
  {
    title: 'Website content',
    links: [
      { label: 'Programs', href: '/admin/programs', icon: 'layers' },
      { label: 'Projects & Our Works', href: '/admin/projects', icon: 'briefcase' },
      { label: 'Events', href: '/admin/events', icon: 'calendar' },
      { label: 'News & Notices', href: '/admin/news', icon: 'megaphone' },
      { label: 'Gallery', href: '/admin/gallery', icon: 'image' },
      { label: 'Content sections', href: '/admin/content-sections', icon: 'file-text' },
      { label: 'Women Empowered', href: '/admin/content-sections?group=WOMEN', icon: 'sparkles' },
      { label: 'Beneficiaries', href: '/admin/beneficiaries', icon: 'users' },
      { label: 'Donors & supporters', href: '/admin/donors', icon: 'heart' },
      { label: 'Supporter donations', href: '/admin/donors/amounts', icon: 'banknote' },
    ],
  },
  {
    title: 'People',
    links: [
      // The working list: duties, monthly tasks, evaluation and ranking.
      { label: 'Member management', href: '/admin/member-management', icon: 'briefcase' },
      // The accounts themselves: creating one, passwords, roles, verification.
      { label: 'Members', href: '/admin/members', icon: 'users' },
      // ========================================
      // MEMBER REGISTRATION REQUESTS
      // ========================================
      // The queue of people who asked to join from /member/portal. It sits right
      // under Members because approving one is the step that eventually creates a
      // member - but a request is NOT an account, and this screen says so.
      { label: 'Member registration requests', href: REQUESTS_HREF, icon: 'user-plus' },
      // ========================================
      // KARYA SAMITI (à¤•à¤¾à¤°à¥à¤¯ à¤¸à¤®à¤¿à¤¤à¤¿)
      // ========================================
      { label: 'Karya Samiti', href: '/admin/karya-samiti', icon: 'users' },
      { label: 'Committee responsibilities', href: '/admin/karya-samiti/duties', icon: 'shield-check' },
      { label: 'Duties of each post', href: '/admin/karya-samiti/role-duties', icon: 'file-text' },
      { label: 'Committee posts', href: '/admin/karya-samiti/posts', icon: 'file-text' },
      { label: 'Member tasks', href: '/admin/tasks', icon: 'check-circle' },
    ],
  },
  {
    title: 'Inbox',
    links: [
      { label: 'Join applications', href: '/admin/applications', icon: 'user-plus' },
      { label: 'Contact messages', href: '/admin/messages', icon: 'mail' },
      // ========================================
      // MESSAGES FROM MEMBERS (member panel -> Messages)
      // ========================================
      // The private conversation between a member and the office. Not the same
      // as the contact form above, which comes from the public website.
      { label: 'Messages from members', href: '/admin/member-messages', icon: 'mail' },
    ],
  },
  {
    // ========================================
    // FUND MANAGEMENT (Donation & Fund System)
    // ========================================
    title: 'Fund management',
    links: [
      { label: 'Fund dashboard', href: '/admin/fund', icon: 'chart' },
      // The name matches the page and the guide, so "Monthly fund records" can
      // be found by searching for the words on the screen.
      { label: 'Monthly fund records', href: '/admin/fund/collections', icon: 'banknote' },
      { label: 'Payment verification', href: VERIFY_HREF, icon: 'check-circle' },
      { label: 'Monthly tracking', href: '/admin/fund/contributions', icon: 'calendar' },
      { label: 'Expenses', href: '/admin/fund/expenses', icon: 'briefcase' },
      // The words "QR" and "eSewa / Khalti" are in the label on purpose: this is
      // where an administrator adds a bank account, a wallet and its QR picture.
      { label: 'Payment settings & QR', href: '/admin/fund/banks', icon: 'qr-code' },
      { label: 'Fund categories', href: '/admin/fund/categories', icon: 'layers' },
      { label: 'Reports & export', href: '/admin/fund/reports', icon: 'file-text' },
      // The committee's Excel workbook, kept beside the live figures.
      { label: 'Fund workbook (Excel)', href: '/admin/fund/workbook', icon: 'download' },
    ],
  },
  {
    // ========================================
    // LOAN MANAGEMENT (Super Admin only)
    // ========================================
    // Loans are money leaving the organization, so they live in their own area
    // and are never mixed into the monthly member fund.
    title: 'Loans',
    superAdminOnly: true,
    links: [{ label: 'Loan management', href: '/admin/loans', icon: 'banknote' }],
  },
  {
    // ========================================
    // SUPER ADMIN - THE WHOLE PICTURE
    // ========================================
    // One screen that adds up members, the monthly contribution, loans, district
    // work and payments side by side. Each figure keeps its own kind of money -
    // they are shown together, never added together.
    title: 'Super Admin',
    superAdminOnly: true,
    links: [
      { label: 'Master dashboard', href: '/admin/master', icon: 'chart' },
      // These two pages refuse everybody except a Super Administrator, so they
      // belong in this group rather than in the fund menu - a link that leads to
      // "not allowed" is worse than no link.
      { label: 'Collection accounting', href: '/admin/fund/accounting', icon: 'chart' },
      { label: 'Member-wise report', href: '/admin/fund/contributors', icon: 'users' },
    ],
  },
  {
    // ========================================
    // FIELD WORK (77 districts)
    // ========================================
    // What the organization did in each district, with the analytics worked out
    // from those records. Open to every administrator.
    title: 'Field work',
    links: [{ label: 'District activities', href: '/admin/districts', icon: 'layers' }],
  },
  {
    title: 'Records & settings',
    links: [
      // Donation records: gifts from outside the membership. They live away from
      // the fund menu on purpose, because donation money is not member fund.
      { label: 'Donation records', href: '/admin/donations', icon: 'heart' },
      { label: 'My notes', href: '/admin/notes', icon: 'file-text' },
      { label: 'Language settings', href: '/admin/language', icon: 'globe' },
      { label: 'Website settings', href: '/admin/settings', icon: 'settings' },
      // Two-step verification and the private sign-in address, for MY account.
      { label: 'Sign-in security', href: '/admin/security', icon: 'shield-check' },
      { label: 'Activity log', href: '/admin/activity', icon: 'activity' },
    ],
  },
];

/**
 * The small counter shown next to a link.
 *
 * Two tones, picked from the same palette as the link itself, so the number is
 * readable whether the link is the highlighted one or not.
 */
function CountBadge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
        active ? 'bg-white text-blue-700' : 'bg-amber-500 text-white',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

const GROUP_KEY: Record<string, string> = {
  Overview: 'admin.g.overview',
  'Website content': 'admin.g.content',
  People: 'admin.g.people',
  Inbox: 'admin.g.inbox',
  'Fund management': 'admin.g.fund',
  'Field work': 'admin.g.field',
  'Records & settings': 'admin.g.records',
};

export function AdminNav({
  isSuperAdmin = false,
  pendingCount = 0,
  pendingRequests = 0,
  lang,
}: {
  lang: Lang;
  isSuperAdmin?: boolean;
  /** How many payments are waiting for verification. 0 hides the badge. */
  pendingCount?: number;
  /** How many membership requests are waiting. 0 hides the badge. */
  pendingRequests?: number;
}) {
  const pathname = usePathname();

  // ---------- the live number of membership requests ----------
  // The layout renders the first number on the server, so it is right on the very
  // first paint. After that this keeps it honest without a page reload: somebody
  // sending a request from their phone makes the badge appear on this screen too.
  const [liveRequests, setLiveRequests] = useState(pendingRequests);

  useEffect(() => {
    setLiveRequests(pendingRequests);
  }, [pendingRequests]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch('/api/admin/membership-requests/pending-count', {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { ok: true; data: { pending: number } };
        if (!cancelled && payload.ok === true) setLiveRequests(payload.data.pending);
      } catch {
        /* a failed poll is not worth telling anybody about - the next one fixes it */
      }
    };

    const timer = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const isActive = (href: string) => {
    const base = href.split('?')[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  // A group marked superAdminOnly is left out for ordinary administrators.
  const groups = NAV_GROUPS.filter((group) => !group.superAdminOnly || isSuperAdmin);

  // ---------- collapsible groups ----------
  // Only the headings are shown at first. The group that contains the page you
  // are on opens by itself, so your current place is never hidden.
  const activeGroup = groups.find((group) => group.links.some((link) => isActive(link.href)))?.title;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroups({ [activeGroup]: true });
  }, [activeGroup]);

  const toggleGroup = (title: string) =>
    setOpenGroups((current) => (current[title] ? {} : { [title]: true }));

  return (
    <nav aria-label="Admin panel menu" className="space-y-4">
      {groups.map((group) => (
        <div key={group.title}>
          <button
            type="button"
            onClick={() => toggleGroup(group.title)}
            aria-expanded={Boolean(openGroups[group.title])}
            className={cn(
              // Green button, dark readable words. The open group turns solid
              // green so it is obvious which one is showing its items.
              'mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors',
              openGroups[group.title]
                ? 'text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <span>{GROUP_KEY[group.title] ? t(lang, GROUP_KEY[group.title]) : group.title}</span>
            <Icon
              name="chevron-down"
              className={cn(
                'h-3 w-3 transition-transform',
                openGroups[group.title] ? 'rotate-180' : '',
              )}
            />
          </button>

          <ul className={cn('space-y-px', !openGroups[group.title] && 'hidden')}>
            {group.links.map((link) => {
              const active = isActive(link.href);
              const badge =
                link.href === VERIFY_HREF
                  ? pendingCount
                  : link.href === REQUESTS_HREF
                    ? liveRequests
                    : 0;

              return (
                <li key={link.href}>
                  <PanelNavLink
                    href={link.href}
                    active={active}
                    className={cn(
                      // Compact rows: smaller type and less padding, so the whole
                      // menu fits on one screen without endless scrolling.
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium leading-tight transition-colors',
                      // Selected item: a light green tint, not a solid block, so the
                      // sidebar stays calm and the yellow group button stands out.
                      active
                        ? 'bg-blue-600 font-semibold text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <Icon name={link.icon} className="h-3.5 w-3.5 shrink-0" />
                    {/* The number is read out too, because the badge is only a
                        coloured circle otherwise. */}
                    <span className="truncate" aria-label={badge > 0 ? `${tx(lang, link.href, link.label)}, ${badge} waiting` : undefined}>
                      {tx(lang, link.href, link.label)}
                    </span>
                    <CountBadge count={badge} active={active} />
                  </PanelNavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ========================================
// MOBILE VERSION
// A horizontal row of the most used sections, shown above the content on
// small screens. It can be scrolled sideways.
// ========================================
export function AdminMobileNav({
  isSuperAdmin = false,
  pendingCount = 0,
  pendingRequests = 0,
}: {
  isSuperAdmin?: boolean;
  pendingCount?: number;
  pendingRequests?: number;
}) {
  const pathname = usePathname();

  const QUICK_LINKS = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: 'grid' as const },
    // Payment verification belongs here: on a phone it is the screen an
    // administrator is most likely to open, and the badge saves them from
    // opening it just to count.
    { label: 'Verify', href: VERIFY_HREF, icon: 'check-circle' as const },
    { label: 'Programs', href: '/admin/programs', icon: 'layers' as const },
    { label: 'Projects', href: '/admin/projects', icon: 'briefcase' as const },
    { label: 'Events', href: '/admin/events', icon: 'calendar' as const },
    { label: 'News', href: '/admin/news', icon: 'megaphone' as const },
    { label: 'Gallery', href: '/admin/gallery', icon: 'image' as const },
    { label: 'Members', href: '/admin/members', icon: 'users' as const },
    { label: 'Management', href: '/admin/member-management', icon: 'briefcase' as const },
    // The join-up queue. On a phone this is the list an administrator is most
    // likely to check after somebody says "I sent the form", so it gets a chip.
    { label: 'Requests', href: REQUESTS_HREF, icon: 'user-plus' as const },
    { label: 'Joins', href: '/admin/applications', icon: 'user-plus' as const },
    { label: 'Messages', href: '/admin/messages', icon: 'mail' as const },
    // Loans are Super Admin only, so the chip is only offered to them.
    ...(isSuperAdmin
      ? [{ label: 'Loans', href: '/admin/loans', icon: 'banknote' as const }]
      : []),
    { label: 'Settings', href: '/admin/settings', icon: 'settings' as const },
  ];

  return (
    <nav
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
      aria-label="Admin panel quick menu"
    >
      {QUICK_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const badge =
          link.href === VERIFY_HREF
            ? pendingCount
            : link.href === REQUESTS_HREF
              ? pendingRequests
              : 0;

        return (
          <PanelNavLink
            key={link.href}
            href={link.href}
            active={active}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 ring-inset transition-colors',
              active
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-white text-ink-700 ring-ink-300',
            )}
          >
            <Icon name={link.icon} className="h-3.5 w-3.5" />
            {link.label}
            {badge > 0 ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  active ? 'bg-white text-brand-700' : 'bg-amber-500 text-white',
                )}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            ) : null}
          </PanelNavLink>
        );
      })}
    </nav>
  );
}

