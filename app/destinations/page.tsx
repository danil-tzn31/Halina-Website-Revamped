import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  DestinationGrid,
  SEE_ALL_BENTO_SPAN_PATTERN,
} from "@/components/destinations/destination-grid";
import { DESTINATIONS } from "@/lib/destinations/data";

// The "see all" counterpart to the homepage's DestinationsSection, which
// only ever shows a hand-picked six (getHomepageFeaturedDestinations).
// This page renders every destination in DESTINATIONS instead — same
// DestinationGrid/DestinationCard components, same bento sizing logic, just
// a longer list. Reusing those components (rather than building a separate
// layout from scratch) is exactly why the earlier zero-gap fix and the
// same-shape-adjacency work were done at the reusable pattern level
// instead of hard-coded for six cards — this page is the payoff of that
// choice: nothing here had to be re-solved.
//
// This page does pass its own `pattern` prop though: without it, this grid
// would repeat the exact same 6-shape cycle the homepage uses, starting
// from the same point, so the two grids would look identical at a glance.
// SEE_ALL_BENTO_SPAN_PATTERN is a different (not just rotated) ordering
// that's equally optimal for the no-same-shape-neighbors rule — see the
// comment above it in destination-grid.tsx for how it was chosen.
export default function DestinationsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />

      {/* pt-[104px] reserves the space the fixed-position Navbar needs —
          same pattern as app/hotels/page.tsx and app/flights/page.tsx. */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-14 pt-[104px] sm:px-10">
        <h1 className="text-3xl font-light tracking-tight text-ink">
          All destinations
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {DESTINATIONS.length} places across the Philippines, worth building a trip around.
        </p>

        <DestinationGrid
          destinations={DESTINATIONS}
          className="mt-8"
          pattern={SEE_ALL_BENTO_SPAN_PATTERN}
        />
      </main>

      <Footer />
    </div>
  );
}
