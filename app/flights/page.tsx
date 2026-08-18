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

// The "Show all results" destination from the homepage carousel. This is a
// Server Component — it fetches directly via the same provider function
// the API route uses (no need to round-trip through our own
// /api/flights/search over HTTP when we're already on the server) and
// renders the full result set as a grid rather than an 8-item carousel,
// per the pattern locked in during Day 2.
//
// Round trip is validated separately from the one-way leg (flightSearchSchema
// only ever describes a single from/to/date/adults search — see
// lib/flights/types.ts) via tripDetailsSchema, which adds tripType/
// returnDate on top. When it's a round trip, this fetches BOTH legs
// server-side — the outbound search and, swapping from/to, the return
// search — before rendering anything, since there's no reason to make the
// browser do a second round-trip once the server already has both results.
//
// `searchParams` is a Promise here, not a plain object — Next.js 16 (like
// 15 before it) made this async on purpose so the framework can decide
// per-request whether this page needs to opt out of static rendering,
// instead of every page implicitly becoming dynamic just because
// `searchParams` exists as a prop.
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

      {/* pt-[104px] (rather than the plain py-14 this used before Navbar
          became a floating, fixed-position header) is exactly how much
          room the nav now needs reserved above real content on any page
          that doesn't open on a full-bleed photo — see
          components/layout/navbar.tsx for why. */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-14 pt-[104px] sm:px-10">
        {/* ResultsPageShell wraps both the search bar and the results area
            below so they can share one "is a search currently running"
            flag — see results-transition.tsx for the full reasoning behind
            why this needs to be more than just a <Suspense> boundary. */}
        <ResultsPageShell>
          {/* mode="results" instead of the homepage's default "home" mode —
              submitting this one navigates straight to /flights or /hotels
              (whichever tab is selected) instead of back through `/`, so you
              can tweak a search and re-run it without leaving this page. See
              search-bar.tsx's `mode` prop for the full reasoning. Pre-filled
              from the current search (when it parsed successfully) so this
              reads as "your search, editable" rather than a blank form you'd
              have to refill from scratch. */}
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
            // Two different loading states doing two different jobs here:
            // <Suspense> covers the very first time this content renders
            // (a fresh page load, or arriving here via a link from
            // elsewhere) — React can only suspend around an async
            // component, which is exactly why the actual fetch lives in its
            // own component (FlightResults, below) instead of being awaited
            // inline in this page. <ResultsPending> covers every *later*
            // re-search from the inline search bar on this same page — see
            // results-transition.tsx for why that case needs its own
            // handling and isn't already covered by the Suspense boundary.
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
