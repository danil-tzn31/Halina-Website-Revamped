import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  DestinationGrid,
  SEE_ALL_BENTO_SPAN_PATTERN,
} from "@/components/destinations/destination-grid";
import { DESTINATIONS } from "@/lib/destinations/data";

// "See all" counterpart to the homepage's DestinationsSection, which only
// shows a hand-picked six. Renders every destination in DESTINATIONS with
// the same DestinationGrid/DestinationCard components and bento sizing.
//
// Passes its own `pattern` prop — without it this grid would repeat the
// same 6-shape cycle the homepage uses, so the two would look identical
// at a glance. SEE_ALL_BENTO_SPAN_PATTERN is a different ordering that's
// equally valid for the no-same-shape-neighbors rule (see
// destination-grid.tsx).
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
