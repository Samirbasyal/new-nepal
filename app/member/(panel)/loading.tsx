// ========================================
// MEMBER PANEL - INSTANT LOADING SHELL
// ========================================
// Next.js shows this file the moment a member clicks a link in the panel, while
// the real page is still being prepared on the server.
//
// Without it the browser keeps showing the previous page, frozen, until the
// server answers - which is what made clicking feel slow.
//
// It is rendered INSIDE the panel layout, so the member's menu and the panel
// header stay exactly where they are and nothing jumps. Only the page area
// changes, and it changes instantly.
// ========================================

/** A single grey block. Width/height come from the caller so the real page and
 *  this placeholder have the same size - that is what stops the layout jumping. */
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-ink-200/70 ${className}`} />;
}

export default function MemberPanelLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading, please wait…</span>

      {/* ---------- Page title ---------- */}
      <div className="mb-6">
        <Bar className="h-7 w-56" />
        <Bar className="mt-3 h-4 w-80 max-w-full" />
      </div>

      {/* ---------- The "monthly payment" style summary card ---------- */}
      <div className="rounded-xl border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Bar className="h-5 w-56" />
            <Bar className="mt-3 h-4 w-40" />
          </div>
          <Bar className="h-9 w-28 rounded-full" />
        </div>
      </div>

      {/* ---------- A row of small information cards ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="rounded-xl border border-ink-200 bg-white p-5">
            <Bar className="h-4 w-20" />
            <Bar className="mt-4 h-7 w-28" />
          </div>
        ))}
      </div>

      {/* ---------- A list ---------- */}
      <div className="mt-6 overflow-hidden rounded-xl border border-ink-200 bg-white">
        <div className="border-b border-ink-200 bg-ink-50 px-5 py-4">
          <Bar className="h-5 w-44" />
        </div>
        <div className="divide-y divide-ink-100">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-4 px-5 py-4">
              <Bar className="h-4 w-1/3" />
              <Bar className="ml-auto h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
