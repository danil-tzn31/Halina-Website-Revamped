import { Suspense } from "react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FlightResultsGrid } from "@/components/sections/flight-results-grid";
import { FlightResultCardSkeleton } from "@/components/sections/flight-result-card";
import { ResultsPageSkeleton } from "@/components/sections/results-page-skeleton";
import { ResultsPageShell, ResultsPending } from "@/components/sections/results-transition";
import { SearchBar } from "@/components/sections/search-bar";
import {
  flightSearchSchema,
  tripDetailsSchema,
  type FlightSearchInput,
} from "@/lib/validators/flight-search";
import { searchFlights } from "@/lib/flights/google-flights-provider";
import { findAirportLabel } from "@/lib/flights/airports";

// Full-results destination for the homepage carousel's "Show all results"
// link. Server Component — fetches directly via the same provider
// function the API route uses, rather than round-tripping through
// /api/flights/search over HTTP.
//
// Round trip is validated separately from the one-way leg
// (flightSearchSchema only describes a single from/to/date/adults search
// — see lib/flights/types.ts) via tripDetailsSchema, which adds
// tripType/returnDate. For a round trip, both legs are fetched
// server-side before rendering, so the browser doesn't need a second
// round-trip.
//
// `searchParams` is a Promise — Next.js decides per-request whether this
// page needs to opt out of static rendering, rather than every page
// implicitly becoming dynamic just because `searchParams` exists as a prop.
export default async function FlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const parsed = flightSearchSchema.safeParse({
    from: params.from,
    to: params.to,
    date: params.date,
    adults: params.adults,
  });
  const tripDetails = tripDetailsSchema.safeParse({
    date: params.date,
    tripType: params.tripType,
    returnDate: params.returnDate,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />

      {/* pt-[104px] reserves the space the fixed-position Navbar needs on
          any page that doesn't open on a full-bleed photo — see
          components/layout/navbar.tsx. */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-14 pt-[104px] sm:px-10">
        {/* ResultsPageShell wraps the search bar and results area so they
            share one "search running" flag — see results-transition.tsx. */}
        <ResultsPageShell>
          {/* mode="results" navigates straight to /flights or /hotels
              instead of back through `/`, so a search can be tweaked and
              re-run without leaving this page — see search-bar.tsx's
              `mode` prop. Pre-filled from the current search when it
              parsed successfully. */}
          <SearchBar
            mode="results"
            initialTab="flights"
            initialFrom={parsed.success ? findAirportLabel(parsed.data.from) : undefined}
            initialTo={parsed.success ? findAirportLabel(parsed.data.to) : undefined}
            initialDepart={parsed.success ? parsed.data.date : undefined}
            initialReturn={tripDetails.success ? tripDetails.data.returnDate : undefined}
            initialTripType={tripDetails.success ? tripDetails.data.tripType : undefined}
            initialAdults={parsed.success ? parsed.data.adults : undefined}
          />

          <div className="mt-16">
          {!parsed.success ? (
            <p className="text-[15px] text-ink-soft">
              Missing or invalid search details — use the search bar above to
              try again.
            </p>
          ) : (
            // <Suspense> covers the first render (fresh load or incoming
            // link) — React can only suspend around an async component,
            // which is why the fetch lives in its own component
            // (FlightResults, below) rather than being awaited inline.
            // <ResultsPending> covers re-searches from the inline search
            // bar on this same page — see results-transition.tsx.
            <ResultsPending
              skeleton={<ResultsPageSkeleton CardSkeleton={FlightResultCardSkeleton} />}
            >
              <Suspense fallback={<ResultsPageSkeleton CardSkeleton={FlightResultCardSkeleton} />}>
                <FlightResults searchInput={parsed.data} tripDetails={tripDetails} />
              </Suspense>
            </ResultsPending>
          )}
          </div>
        </ResultsPageShell>
      </main>

      <Footer />
    </div>
  );
}

async function FlightResults({
  searchInput,
  tripDetails,
}: {
  searchInput: FlightSearchInput;
  tripDetails: ReturnType<typeof tripDetailsSchema.safeParse>;
}) {
  const isRoundTrip = tripDetails.success && tripDetails.data.tripType === "round_trip";

  const outboundResult = await searchFlights(searchInput);

  const returnResult =
    isRoundTrip && tripDetails.success && tripDetails.data.returnDate
      ? await searchFlights({
          from: searchInput.to,
          to: searchInput.from,
          date: tripDetails.data.returnDate,
          adults: searchInput.adults,
        })
      : null;

  return (
    <>
      <h1 className="text-3xl font-light tracking-tight text-ink">
        {searchInput.from}{" "}
        <span className="text-ink-soft">{returnResult ? "⇄" : "→"}</span>{" "}
        {searchInput.to}
      </h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        {returnResult && tripDetails.success && tripDetails.data.returnDate
          ? `${searchInput.date} – ${tripDetails.data.returnDate}`
          : searchInput.date}{" "}
        · {searchInput.adults}{" "}
        {searchInput.adults === 1 ? "adult" : "adults"} ·{" "}
        {returnResult
          ? `${outboundResult.offers.length} departure, ${returnResult.offers.length} return`
          : `${outboundResult.offers.length} result${outboundResult.offers.length === 1 ? "" : "s"}`}
      </p>

      {(outboundResult.isFallback || returnResult?.isFallback) && (
        <p className="mt-2 text-[12.5px] italic text-sand">
          Showing sample results — the live flight API didn&apos;t respond,
          so this is seeded demo data.
        </p>
      )}

      <div className="mt-8">
        <FlightResultsGrid
          tripType={returnResult ? "round_trip" : "one_way"}
          fromCode={searchInput.from}
          toCode={searchInput.to}
          date={searchInput.date}
          returnDate={
            returnResult && tripDetails.success ? tripDetails.data.returnDate : undefined
          }
          guests={searchInput.adults}
          outboundOffers={outboundResult.offers}
          returnOffers={returnResult?.offers}
          outboundIsFallback={outboundResult.isFallback}
          returnIsFallback={returnResult?.isFallback}
        />
      </div>
    </>
  );
}
