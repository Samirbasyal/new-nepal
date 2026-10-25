// ========================================
// DONOR SIGN-IN - THE DARK PURPLE FRAME
// ========================================
// Donating is a different act from joining the club, so the donor pages get
// their own room: a deep black-purple background, a glass card with a neon-purple
// edge, and purple buttons. Same club, same logo, different mood.
//
// The rules for the shared form controls live in the <style> block below, scoped
// to .donor-auth, so the green member pages are untouched.
// ========================================

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/layout/Logo';
import { organization } from '@/config/site';

export function DonorAuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="donor-auth relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0a0612] text-white">
      <style>{`
        .donor-auth {
          background-image:
            radial-gradient(1000px 600px at 15% -10%, rgba(124, 58, 237, 0.35), transparent 65%),
            radial-gradient(900px 500px at 90% 10%, rgba(217, 70, 239, 0.22), transparent 60%),
            radial-gradient(700px 500px at 50% 110%, rgba(76, 29, 149, 0.45), transparent 65%);
        }
        .donor-auth .donor-card {
          background: rgba(24, 12, 45, 0.72);
          border: 1px solid rgba(167, 139, 250, 0.35);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03) inset, 0 30px 80px -20px rgba(124, 58, 237, 0.55);
          backdrop-filter: blur(18px);
          animation: donor-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .donor-auth .donor-glow {
          position: absolute; inset: -30% -10% auto -10%; height: 60%;
          background: radial-gradient(closest-side, rgba(168, 85, 247, 0.45), transparent);
          filter: blur(60px); pointer-events: none;
          animation: donor-drift 12s ease-in-out infinite alternate;
        }
        .donor-auth label { color: rgba(233, 224, 255, 0.85) !important; }
        .donor-auth input {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(167, 139, 250, 0.35) !important;
          color: #fff !important;
          border-radius: 14px !important;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .donor-auth input::placeholder { color: rgba(196, 181, 253, 0.45) !important; }
        .donor-auth input:focus {
          border-color: #a78bfa !important;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.25), 0 0 22px rgba(167, 139, 250, 0.25) !important;
          outline: none !important;
          background: rgba(255,255,255,0.08) !important;
        }
        .donor-auth .btn-primary, .donor-auth button[type="submit"] {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 55%, #d946ef 100%) !important;
          border: 0 !important;
          color: #fff !important;
          border-radius: 14px !important;
          box-shadow: 0 12px 30px -10px rgba(168, 85, 247, 0.7) !important;
          transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
        }
        .donor-auth .btn-primary:hover, .donor-auth button[type="submit"]:hover {
          transform: translateY(-1px);
          filter: brightness(1.06);
          box-shadow: 0 18px 40px -12px rgba(217, 70, 239, 0.75) !important;
        }
        .donor-auth .btn-primary:active, .donor-auth button[type="submit"]:active { transform: translateY(0) scale(0.995); }
        .donor-auth a { color: #c4b5fd; }
        .donor-auth a:hover { color: #ede9fe; }
        .donor-auth .text-ink-500, .donor-auth .text-ink-600, .donor-auth .text-ink-700 { color: rgba(214, 205, 235, 0.75) !important; }
        .donor-auth .text-ink-900 { color: #fff !important; }
        .donor-auth .card {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(167,139,250,0.28) !important;
          box-shadow: none !important;
        }
        .donor-auth .card .text-ink-900 { color: #fff !important; }
        .donor-auth [class*="border-ink-200"] { border-color: rgba(167,139,250,0.25) !important; }
        @keyframes donor-rise { from { opacity: 0; transform: translateY(18px) scale(0.99); } to { opacity: 1; transform: none; } }
        @keyframes donor-drift { from { transform: translate3d(-4%, -2%, 0) scale(1); } to { transform: translate3d(4%, 4%, 0) scale(1.08); } }
        @media (prefers-reduced-motion: reduce) {
          .donor-auth .donor-card, .donor-auth .donor-glow { animation: none !important; }
          .donor-auth * { transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div className="donor-glow" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size={38} onDark />
          <span className="leading-tight">
            <span className="block text-sm font-bold text-white">{organization.name}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/80">
              Donor account
            </span>
          </span>
        </Link>
        <Link
          href="/donate"
          className="rounded-full border border-purple-400/30 px-4 py-1.5 text-xs font-semibold text-purple-200 transition-colors hover:border-purple-300/60 hover:text-white"
        >
          Back to donations
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-14 pt-2 sm:px-6">
        <div className="donor-card w-full max-w-md rounded-3xl p-6 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-purple-100/70">{subtitle}</p>
          ) : null}

          <div className="mt-6">{children}</div>

          {footer ? (
            <div className="mt-6 border-t border-purple-300/15 pt-4 text-center text-xs text-purple-100/70">
              {footer}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center text-[11px] text-purple-200/40">
        {organization.name} · Every rupee is recorded and verified by the committee.
      </footer>
    </div>
  );
}
