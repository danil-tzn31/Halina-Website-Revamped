import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DestinationBrowser } from "@/components/destinations/destination-browser";
import { DESTINATIONS } from "@/lib/destinations/data";

// "See all" counterpart to the homepage's DestinationsSection, which only
// shows a hand-picked six. Renders every destination in DESTINATIONS with
// the same DestinationGrid/DestinationCard components and bento sizing.
//
// The grid and its filter chips live in DestinationBrowser, which still
// uses SEE_ALL_BENTO_SPAN_PATTERN when nothing is filtered, so this page
// doesn't repeat the homepage's 6-shape cycle (see destination-grid.tsx).
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
        <DestinationBrowser destinations={DESTINATIONS} />
      </main>

      <Footer />
    </div>
  );
}
