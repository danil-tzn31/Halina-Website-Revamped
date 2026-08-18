import { Suspense } from "react";

import { Hero } from "@/components/sections/hero";
import { SearchResultsSection } from "@/components/sections/search-results-section";
import { DestinationsSection } from "@/components/sections/destinations-section";
import { Footer } from "@/components/layout/footer";

// `searchParams` here is used for exactly one thing: reading the
// prefill* values that app/destinations/[slug]/page.tsx's "Search
// flights/hotels here" links (prefillTab/prefillTo/prefillDestination) and
// the AI trip search's own match links (components/destinations/ai-trip-
// search-modal.tsx — prefillDepart/prefillCheckIn/prefillCheckOut/
// prefillAdults/prefillGuests, added in section 42) set, so the search bar
// arrives with the right tab and fields already filled in. This is a plain
// Server Component prop read (same pattern as app/flights/page.tsx), not a
// client-side useSearchParams() call — it doesn't need its own Suspense
// boundary the way SearchResultsSection does.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const prefillTab = params.prefillTab === "hotels" ? "hotels" : params.prefillTab === "flights" ? "flights" : undefined;
  const prefillTo = typeof params.prefillTo === "string" ? params.prefillTo : undefined;
  const prefillDestination =
    typeof params.prefillDestination === "string" ? params.prefillDestination : undefined;

  // All five of these are optional and only ever set by the AI trip
  // search's own links — the destination page's older prefill links never
  // set them, so this reads as `undefined` there and SearchBar just falls
  // back to its own defaults, exactly as it already did before this
  // section existed.
  const prefillDepart = typeof params.prefillDepart === "string" ? params.prefillDepart : undefined;
  const prefillCheckIn = typeof params.prefillCheckIn === "string" ? params.prefillCheckIn : undefined;
  const prefillCheckOut = typeof params.prefillCheckOut === "string" ? params.prefillCheckOut : undefined;
  const prefillAdultsRaw = typeof params.prefillAdults === "string" ? Number(params.prefillAdults) : undefined;
  const prefillGuestsRaw = typeof params.prefillGuests === "string" ? Number(params.prefillGuests) : undefined;
  // Guards against a malformed/tampered query string (e.g. `?prefillAdults=abc`
  // or a negative number) turning into `NaN` or a nonsense value reaching
  // SearchBar's own state — the same "don't trust a URL param blindly"
  // instinct as every other validated input in this app, just applied to
  // a query string instead of a form submission.
  const prefillAdults =
    prefillAdultsRaw !== undefined && Number.isInteger(prefillAdultsRaw) && prefillAdultsRaw >= 1 && prefillAdultsRaw <= 9
      ? prefillAdultsRaw
      : undefined;
  const prefillGuests =
    prefillGuestsRaw !== undefined && Number.isInteger(prefillGuestsRaw) && prefillGuestsRaw >= 1 && prefillGuestsRaw <= 9
      ? prefillGuestsRaw
      : undefined;

  return (
    <>
      <Hero
        initialTab={prefillTab}
        initialTo={prefillTo}
        initialDestination={prefillDestination}
        initialDepart={prefillDepart}
        initialCheckIn={prefillCheckIn}
        initialCheckOut={prefillCheckOut}
        initialAdults={prefillAdults}
        initialGuests={prefillGuests}
      />
      {/* Wrapped in Suspense because SearchResultsSection reads
          useSearchParams — same requirement as AuthQueryListener. Nothing
          renders here until a search has actually been submitted (no
          ?type= in the URL yet). */}
      <Suspense fallback={null}>
        <SearchResultsSection />
      </Suspense>
      <DestinationsSection />
      <Footer />
    </>
  );
}
