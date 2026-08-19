import { Suspense } from "react";

import { Hero } from "@/components/sections/hero";
import { SearchResultsSection } from "@/components/sections/search-results-section";
import { DestinationsSection } from "@/components/sections/destinations-section";
import { Footer } from "@/components/layout/footer";

// Reads prefill* params set by the destination page's "Search flights/
// hotels here" links and the AI trip search modal's match links, so the
// search bar lands with the right tab and fields already filled in. Plain
// Server Component prop read (same pattern as app/flights/page.tsx), not
// client-side useSearchParams(), so it doesn't need its own Suspense
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

  // Only ever set by the AI trip search's own links; the destination
  // page's prefill links don't set these, so SearchBar falls back to its
  // own defaults.
  const prefillDepart = typeof params.prefillDepart === "string" ? params.prefillDepart : undefined;
  const prefillCheckIn = typeof params.prefillCheckIn === "string" ? params.prefillCheckIn : undefined;
  const prefillCheckOut = typeof params.prefillCheckOut === "string" ? params.prefillCheckOut : undefined;
  const prefillAdultsRaw = typeof params.prefillAdults === "string" ? Number(params.prefillAdults) : undefined;
  const prefillGuestsRaw = typeof params.prefillGuests === "string" ? Number(params.prefillGuests) : undefined;
  // Guards against a malformed/tampered query string (e.g.
  // `?prefillAdults=abc` or a negative number) turning into `NaN` or a
  // nonsense value reaching SearchBar's state.
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
      {/* SearchResultsSection reads useSearchParams, so it needs its own
          Suspense boundary. Renders nothing until a search is submitted. */}
      <Suspense fallback={null}>
        <SearchResultsSection />
      </Suspense>
      <DestinationsSection />
      <Footer />
    </>
  );
}
