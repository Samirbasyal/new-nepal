// ========================================
// ERROR PAGE - SOMETHING WENT WRONG
// This code controls what a visitor sees if a page crashes.
// ========================================
// In development Next.js also shows the technical details, which is very
// useful while you are editing the project.
//
// "use client" is required: an error page must be interactive so the visitor
// can press the "Try again" button.
// ========================================

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  /** Re-renders the part of the page that failed. */
  reset: () => void;
}) {
  // Print the technical details in the browser console for debugging.
  useEffect(() => {
    console.error('[page error]', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
          <Icon name="alert" className="h-7 w-7" />
        </span>

        <h1 className="mt-6 font-display text-2xl font-bold text-ink-900">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          We are sorry about that. The problem has been recorded and you can try again. If it keeps
          happening, please contact the office.
        </p>

        {/* A short technical hint (helpful for the developer, harmless for visitors) */}
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-400">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => reset()}>
            <Icon name="refresh" className="h-4 w-4" />
            Try again
          </Button>

          <Link href="/" className="btn btn-outline">
            <Icon name="home" className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' ? (
          <details className="mt-8 rounded-card border border-ink-200 bg-white p-4 text-left">
            <summary className="cursor-pointer text-sm font-semibold text-ink-700">
              Technical details (only visible while developing)
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-red-700">
              {error.message}
            </pre>
          </details>
        ) : null}
      </div>
    </main>
  );
}
