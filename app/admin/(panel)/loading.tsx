// ========================================
// ADMIN PANEL - INSTANT LOADING SHELL
// ========================================
// WHY THIS FILE EXISTS (THIS IS THE "SLOW WEBSITE" FIX)
// ========================================
// Next.js shows this file IMMEDIATELY when somebody clicks a link in the Admin
// Panel, while the real page is still being prepared on the server.
//
// WITHOUT THIS FILE
//   The browser kept showing the OLD page, completely frozen, until the server
//   had finished the new one. On a slow connection that is a second or more of
//   "nothing happened" - the click feels lost, so people click again.
//
// WITH THIS FILE
//   The click is acknowledged instantly, and the grey shapes below tell the
//   person exactly where the content is about to appear.
//
// WHERE IT APPEARS
//   Inside the Admin Panel layout, so the header and the sidebar stay exactly
//   where they were. Nothing on the screen jumps - only the page area changes.
// ========================================

/** A single grey block. The width/height are passed in so shapes match the real page. */
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-ink-200/70 ${className}`} />;
}

export default function AdminPanelLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      {/* Read out to screen readers, and invisible on screen. */}
      <span className="sr-only">Loading, please wait…</span>

      {/* ---------- Page title ---------- */}
      <div className="mb-6">
        <Bar className="h-7 w-64" />
        <Bar className="mt-3 h-4 w-96 max-w-full" />
      </div>

      {/* ---------- Summary cards ----------
          Four cards, exactly like the real dashboards, so the page does not
          grow or shrink when the content arrives. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="rounded-xl border border-ink-200 bg-white p-5">
            <Bar className="h-4 w-24" />
            <Bar className="mt-4 h-8 w-32" />
            <Bar className="mt-3 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* ---------- Table / list ---------- */}
      <div className="mt-8 overflow-hidden rounded-xl border border-ink-200 bg-white">
        <div className="border-b border-ink-200 bg-ink-50 px-5 py-4">
          <Bar className="h-5 w-48" />
        </div>

        <div className="divide-y divide-ink-100">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4 px-5 py-4">
              <Bar className="h-9 w-9 shrink-0 rounded-full" />
              <Bar className="h-4 w-1/3" />
              <Bar className="ml-auto h-4 w-24" />
              <Bar className="h-6 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Keeps the footer from jumping while the real page loads. */}
      <div className="py-6">
        <Bar className="h-4 w-40" />
      </div>
    </div>
  );
}
