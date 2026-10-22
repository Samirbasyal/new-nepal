// ========================================
// ADMIN PANEL - SIGN-IN SECURITY
// ========================================
// Address: /admin/security   (inside the panel, so it needs an admin session)
//
// WHAT IS ON THIS PAGE
//   1. Two-step verification for the signed-in administrator's own account.
//   2. The private sign-in address, so an administrator can bookmark it - it is
//      deliberately absent from every public page, which means the only place it
//      can be looked up is here, behind the lock.
//   3. A short, honest summary of what actually protects the panel.
//
// WHO MAY OPEN IT
//   Any administrator (requireAdmin). It only ever shows and changes the
//   signed-in person's own settings - there is no way to pick another account.
// ========================================

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { MfaSettings } from '@/components/admin/MfaSettings';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_LOGIN_PATH } from '@/lib/auth/admin-entry';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign-in security',
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  const user = await requireAdmin();

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorEnabledAt: true },
  });

  const enabledAt = row?.twoFactorEnabledAt ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Sign-in security</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-600">
        Settings for your own administrator account. Nothing here changes what other administrators
        can do.
      </p>

      <div className="mt-6">
        <MfaSettings
          enabled={Boolean(enabledAt)}
          enabledAt={
            enabledAt
              ? enabledAt.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : null
          }
        />
      </div>

      {/* ---------- The private address ---------- */}
      <section className="mt-8 rounded-card border border-ink-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-ink-100 text-ink-700">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">Where administrators sign in</p>
            <p className="mt-1 text-sm text-ink-600">
              The public website does not link to the sign-in page at all - no menu item, no footer
              link, no button. Bookmark this address:
            </p>
            <p className="mt-2 break-all rounded-btn bg-ink-50 px-3 py-2 font-mono text-sm text-ink-900">
              {ADMIN_LOGIN_PATH}
            </p>
            <p className="mt-2 text-xs text-ink-500">
              The address can be changed with the <code>ADMIN_LOGIN_SLUG</code> environment variable.
              Changing it does not sign anybody out, and it is not what protects the panel - the
              server-side role checks are.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- What actually protects this panel ---------- */}
      <section className="mt-4 rounded-card border border-ink-200 bg-ink-50 p-5 text-sm text-ink-700">
        <p className="font-semibold text-ink-900">What protects the Admin Panel</p>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
          <li>
            • Every admin page re-reads your role from the database on every request
            (<code>lib/auth/guards.ts</code>).
          </li>
          <li>
            • Every admin API does the same, and also refuses requests that did not come from this
            website (<code>lib/api/guard.ts</code>).
          </li>
          <li>• Passwords are stored as bcrypt hashes; sessions are signed, HTTP-only cookies.</li>
          <li>• A normal member who types an admin address is sent to the &quot;not authorized&quot; page.</li>
          <li>
            • The private address above makes the login form hard to find. That is convenience and
            quiet, not the lock - assume somebody could learn it and the panel would still be shut.
          </li>
        </ul>
      </section>
    </div>
  );
}
