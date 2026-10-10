// ========================================
// MEMBER PANEL
// This code controls the "My profile" page.
// ========================================
// Address: /member/profile
//
// A member can update their own name, phone, address, introduction and photo
// link, and change their own password.
//
// The email address, role and membership status are shown but cannot be
// changed here - only an administrator can change those. The server enforces
// this in app/api/member/profile/route.ts.
// ========================================

import type { Metadata } from 'next';
import { requireMember } from '@/lib/auth/guards';
import { StatusBadge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { PasswordForm } from '@/components/forms/PasswordForm';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My profile',
  robots: { index: false, follow: false },
};

export default async function MemberProfilePage() {
  const user = await requireMember();

  // Read only THIS member's own record.
  const account = isDatabaseConfigured()
    ? await prisma.user
        .findUnique({
          where: { id: user.id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            lastLoginAt: true,
            // NOTE: passwordHash is deliberately NOT selected here.
            profile: true,
          },
        })
        .catch(() => null)
    : null;

  const profile = account?.profile ?? null;

  return (
    <div className="space-y-8">
      {/* ========================================
          HEADER
          ======================================== */}
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900">My profile</h1>
        <p className="mt-1 text-sm text-ink-600">
          Keep your own details up to date. Some information can only be changed by an
          administrator.
        </p>
      </header>

      {/* ========================================
          ACCOUNT INFORMATION (READ ONLY)
          ======================================== */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
          <Icon name="lock" className="h-5 w-5 text-ink-500" />
          Account information
        </h2>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Email</dt>
            <dd className="mt-1 break-all text-sm text-ink-800">{account?.email ?? user.email}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Membership number
            </dt>
            <dd className="mt-1 text-sm text-ink-800">{profile?.membershipNo || 'Not set'}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Membership status
            </dt>
            <dd className="mt-1">
              <StatusBadge status={profile?.status} />
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Last sign in
            </dt>
            <dd className="mt-1 text-sm text-ink-800">
              {formatDate(account?.lastLoginAt) || 'This is your first visit'}
            </dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-ink-100 pt-4 text-xs text-ink-500">
          Need to change your email address, membership number or status?{' '}
          <a href="/contact" className="font-medium text-brand-700 hover:underline">
            Contact the organization office
          </a>{' '}
          and an administrator will help.
        </p>
      </section>

      {/* ========================================
          EDITABLE DETAILS
          ======================================== */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
          <Icon name="edit" className="h-5 w-5 text-brand-600" />
          Edit my details
        </h2>

        <div className="mt-5">
          <ProfileForm
            initial={{
              name: account?.name ?? user.name,
              phone: account?.phone ?? '',
              address: profile?.address ?? '',
              bio: profile?.bio ?? '',
              photoUrl: profile?.photoUrl ?? '',
            }}
          />
        </div>
      </section>

      {/* ========================================
          CHANGE PASSWORD
          ======================================== */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
          <Icon name="lock" className="h-5 w-5 text-brand-600" />
          Change my password
        </h2>
        <p className="mt-1 text-sm text-ink-600">
          Choose a password you do not use anywhere else.
        </p>

        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>

      {/* ========================================
          PUBLIC VISIBILITY NOTE
          ======================================== */}
      <section className="rounded-card border border-ink-200 bg-brand-50/60 p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
          <Icon name="shield-check" className="h-5 w-5 text-brand-600" />
          Who can see my details?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          Your details are private. Only administrators can see your full record. Your name, photo,
          role and short introduction appear on the public Members page{' '}
          <strong>only if an administrator marks your profile as public</strong>. Your email
          address, phone number and membership number are never shown publicly.
        </p>
        <p className="mt-2 text-xs text-ink-500">
          Current public listing:{' '}
          <strong>{profile?.isPublic ? 'Yes - shown on the Members page' : 'No - private'}</strong>
        </p>
      </section>
    </div>
  );
}
