// ========================================
// PUBLIC WEBSITE - INSTANT LOADING SHELL
// ========================================
// The public pages read live information from the database, so they cannot be
// handed over instantly. This file appears the moment a visitor clicks a menu
// link, so the click is always acknowledged straight away.
//
// The navbar and the footer come from the layout and stay on screen the whole
// time, so this only fills the middle of the page and nothing jumps around.
// ========================================

/** A single grey block. Width/height come from the caller so the placeholder and
 *  the real page have the same size - that is what stops the layout jumping. */
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-ink-200/70 ${className}`} />;
}

export default function SiteLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading, please wait…</span>

      {/* ---------- Page header band ---------- */}
      <div className="border-b border-ink-200 bg-ink-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Bar className="h-9 w-80 max-w-full" />
          <Bar className="mt-4 h-5 w-full max-w-2xl" />
          <Bar className="mt-2 h-5 w-2/3 max-w-xl" />
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <div key={card} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
              {/* Image place, kept at a fixed height so nothing shifts. */}
              <Bar className="h-40 w-full rounded-none" />
              <div className="p-5">
                <Bar className="h-5 w-3/4" />
                <Bar className="mt-3 h-4 w-full" />
                <Bar className="mt-2 h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
