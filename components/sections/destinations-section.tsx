import Link from "next/link";

import { getHomepageFeaturedDestinations } from "@/lib/destinations/data";
import { DestinationGrid } from "@/components/destinations/destination-grid";

// Static content — plain Server Component, no client-side fetching needed.
//
// Trip finder is a site-wide floating bubble (see TripFinderModal in
// app/layout.tsx); the line below just points visitors at it instead of
// duplicating a trigger card here.
//
// Shows a hand-picked subset via getHomepageFeaturedDestinations() to keep
// the homepage from feeling like a long list — the full set is browsable
// via "See all destinations".
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
