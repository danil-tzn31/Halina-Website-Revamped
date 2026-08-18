import Link from "next/link";

import { getHomepageFeaturedDestinations } from "@/lib/destinations/data";
import { DestinationGrid } from "@/components/destinations/destination-grid";

// Static content, so this stays a plain Server Component — no client-side
// fetching or "use client" needed here.
//
// This section used to also render a "Take the quiz" trigger card
// (DestinationQuizModal) right below the heading, plus a second AI-search
// card below that. Both are gone as of section 43 — they've been merged
// into TripFinderModal, the single site-wide floating bubble mounted once
// in app/layout.tsx (see that component's own comment for the full
// history of why). The line below is what's left of this section's old
// job of pointing visitors at that feature — a small hint rather than a
// full trigger card, since the bubble itself is now visible on every page
// including this one, not just discoverable from here.
//
// This grid renders getHomepageFeaturedDestinations() — a hand-picked
// subset of six, not every destination in DESTINATIONS (section 45). The
// quiz and AI trip search still see and match against all eleven; this
// section is just about keeping the homepage itself from feeling like a
// long, undifferentiated list.
//
// As of this pass, the old uniform 3-column grid (photo on top, a text
// block below it) is gone — this now renders DestinationGrid, an
// asymmetrical/"bento" layout of image-only cards whose name/region/blurb
// live in an overlay on the photo itself (see destination-card.tsx and
// destination-grid.tsx). The "See all destinations" link below now points
// at app/destinations/page.tsx — a dedicated page listing all 38, not
// just this featured six, reusing this same DestinationGrid.
export function DestinationsSection() {
  const destinations = getHomepageFeaturedDestinations();

  return (
    <section className="mx-auto w-full max-w-[1180px] px-6 py-16 sm:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-light text-ink">Where to go next</h2>
        <p className="text-[13px] italic text-ink-soft">
          A few places worth building a trip around
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[13.5px] text-ink-soft">
          Not sure where to go? Use the trip finder in the bottom-right corner — describe your
          trip or just answer a few quick questions.
        </p>
        <Link
          href="/destinations"
          className="shrink-0 whitespace-nowrap text-[13px] text-ink underline-offset-4 hover:underline"
        >
          See all destinations →
        </Link>
      </div>

      <DestinationGrid destinations={destinations} className="mt-8" />
    </section>
  );
}
