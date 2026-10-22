// ========================================
// MEMBER PORTAL - ONE PAGE, TWO TABS
// ========================================
// This replaces the two separate pages (/member/login and /member/register) with
// ONE place people land on:
//
//   [ Register / Request membership ]  [ Login ]
//
// WHY ONE PAGE
//   A person who wants to join does not always know whether they "have an
//   account" - they just want in. Putting both choices behind one heading, with
//   the tabs in the same spot every time, removes that guessing. The old
//   addresses still work: they forward here with the correct tab already chosen,
//   so no bookmark or shared link breaks.
//
// WHAT IS IN EACH TAB
//   Register -> components/member/MembershipRequestForm.tsx (writes a PENDING
//               request; creates no account)
//   Login    -> components/forms/LoginForm.tsx, the same server-checked form the
//               admin panel uses, in member mode
//
// The tab is kept in the address bar (?tab=login), so a refresh stays where the
// person was and the link can be shared.
// ========================================

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/forms/LoginForm';
import { MembershipRequestForm } from '@/components/member/MembershipRequestForm';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type Tab = 'register' | 'login';

export function MemberPortal({
  initialTab = 'login',
  notice,
  next,
}: {
  initialTab?: Tab;
  notice?: string;
  /** Where to go after signing in (already checked on the server). */
  next?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  // Switching tabs writes the choice into the address bar without a full page
  // load, so the browser's back button and a refresh both behave sensibly.
  const select = useCallback(
    (next: Tab) => {
      setTab(next);
      router.replace(`/member/portal?tab=${next}`, { scroll: false });
    },
    [router],
  );

  return (
    <div>
      {/* ---------- Tabs ---------- */}
      <div role="tablist" aria-label="Member portal" className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-ink-200 bg-white p-1">
        <button
          type="button"
          role="tab"
          id="tab-register"
          aria-selected={tab === 'register'}
          aria-controls="panel-register"
          onClick={() => select('register')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors',
            tab === 'register'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-ink-600 hover:text-ink-900',
          )}
        >
          <Icon name="user-plus" className="h-4 w-4" />
          <span className="truncate">Register</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-login"
          aria-selected={tab === 'login'}
          aria-controls="panel-login"
          onClick={() => select('login')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors',
            tab === 'login'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-ink-600 hover:text-ink-900',
          )}
        >
          <Icon name="log-in" className="h-4 w-4" />
          <span className="truncate">Login</span>
        </button>
      </div>

      {/* ---------- Register ---------- */}
      <div
        role="tabpanel"
        id="panel-register"
        aria-labelledby="tab-register"
        hidden={tab !== 'register'}
      >
        {tab === 'register' ? (
          <>
            <MembershipRequestForm onSwitchToLogin={() => select('login')} />
          </>
        ) : null}
      </div>

      {/* ---------- Login ---------- */}
      <div role="tabpanel" id="panel-login" aria-labelledby="tab-login" hidden={tab !== 'login'}>
        {tab === 'login' ? (
          <>
            <LoginForm
              mode="member"
              redirectTo={next && next.startsWith('/member') ? next : '/member/dashboard'}
              notice={notice}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
