// ========================================
// AUTH SHELL - THE FRAME AROUND SIGN-IN TYPE PAGES
// ========================================
// Used by every page outside the member panel that still needs a sign-in look:
//     /member/verify-email, /member/forgot-password, /member/reset-password
//     /donor/login, /donor/register, /donor/forgot-password, /donor/reset-password,
//     /donor/verify-email
//
// It is now a thin wrapper around components/auth/AuthFrame.tsx, which is the ONE
// frame every sign-in and sign-up screen on the website uses - the member portal
// and the administrator sign-in included. Keeping them all on one frame is what
// makes the register page match the login page exactly, with no second design to
// keep in step.
//
// A member who has forgotten their password (or has not verified their email yet)
// cannot sign in, so these pages must be reachable while signed out - which is why
// they draw this simple header instead of the member panel menu.
// ========================================

import type { ReactNode } from 'react';
import { AuthFrame } from '@/components/auth/AuthFrame';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  note = 'Member area',
  width = 'md',
}: {
  /** Heading shown at the top of the card. */
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Small print under the card (for example "back to sign in"). */
  footer?: ReactNode;
  /** Which service this is - shown in small print under the card. */
  note?: string;
  width?: 'md' | 'lg';
}) {
  return (
    <AuthFrame note={note} width={width}>
      <h1 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm leading-relaxed text-ink-600">{subtitle}</p> : null}

      <div className="mt-5">{children}</div>

      {footer ? <div className="mt-4 text-center text-sm text-ink-600">{footer}</div> : null}
    </AuthFrame>
  );
}
