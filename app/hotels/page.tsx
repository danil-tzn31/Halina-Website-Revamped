import { Suspense } from "react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HotelResultsGrid } from "@/components/sections/hotel-results-grid";
import { HotelResultCardSkeleton } from "@/components/sections/hotel-result-card";
import { ResultsPageSkeleton } from "@/components/sections/results-page-skeleton";
import { ResultsPageShell, ResultsPending } from "@/components/sections/results-transition";
import { SearchBar } from "@/components/sections/search-bar";
import { hotelSearchSchema, type HotelSearchInput } from "@/lib/validators/hotel-search";
import { searchHotels } from "@/lib/hotels/tripadvisor-provider";
import { stayPlaceForAirport } from "@/lib/trips";

// Full-results destination for hotel search, mirroring
// app/flights/page.tsx.
export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const parsed = hotelSearchSchema.safeParse({
    destination: params.destination,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: params.guests,
  });

  // `?trip=` comes from a trip's "find a hotel" link. Only trusted for
  // display after checking it's the signed-in user's own trip; the
  // bookings route checks again before attaching anything.
  const trip = typeof params.trip === "string" ? await findOwnTrip(params.trip) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />

      {/* pt-[104px] reserves the space the fixed-position Navbar needs —
          see app/flights/page.tsx. */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-14 pt-[104px] sm:px-10">
        {/* ResultsPageShell lets the search bar and results area share one
            "search running" flag — see results-transition.tsx. */}
        <ResultsPageShell>
          {/* mode="results" — see app/flights/page.tsx and
              search-bar.tsx's `mode` prop. */}
          <SearchBar
            mode="results"
            initialTab="hotels"
            initialDestination={parsed.success ? parsed.data.destination : undefined}
            initialCheckIn={parsed.success ? parsed.data.checkIn : undefined}
            initialCheckOut={parsed.success ? parsed.data.checkOut : undefined}
            initialGuests={parsed.success ? parsed.data.guests : undefined}
            tripId={trip?.id}
          />

          {trip && (
            <p className="mt-6 text-[13.5px] text-ink-soft">
              Adding a hotel to your trip to {stayPlaceForAirport(trip.destination)}.
            </p>
          )}

          <div className="mt-16">
          {!parsed.success ? (
            <p className="text-[15px] text-ink-soft">
              Missing or invalid search details — use the search bar above to
              try again.
            </p>
          ) : (
            // Same split as app/flights/page.tsx: <Suspense> covers the
            // first render, <ResultsPending> covers re-searches from the
            // inline search bar — see results-transition.tsx.
            <ResultsPending
              skeleton={<ResultsPageSkeleton CardSkeleton={HotelResultCardSkeleton} />}
            >
              <Suspense fallback={<ResultsPageSkeleton CardSkeleton={HotelResultCardSkeleton} />}>
                <HotelResults searchInput={parsed.data} tripId={trip?.id} />
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

async function findOwnTrip(tripId: string) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) return null;
  const { prisma } = await import("@/lib/prisma");
  return prisma.trip.findFirst({
    where: { id: tripId, userId: session.user.id },
    select: { id: true, destination: true },
  });
}

async function HotelResults({
  searchInput,
  tripId,
}: {
  searchInput: HotelSearchInput;
  tripId?: string;
}) {
  const result = await searchHotels(searchInput);

  return (
    <>
      <h1 className="text-3xl font-light tracking-tight text-ink">
        Hotels in {searchInput.destination}
      </h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        {searchInput.checkIn} → {searchInput.checkOut} · {searchInput.guests}{" "}
        guest{searchInput.guests === 1 ? "" : "s"} · {result.offers.length} result
        {result.offers.length === 1 ? "" : "s"}
      </p>

      {result.isFallback && (
        <p className="mt-2 text-[12.5px] italic text-sand">
          No live hotel prices came back for this search, so these are sample
          hotels. Try again in a moment for real prices.
        </p>
      )}

      <div className="mt-8">
        <HotelResultsGrid
          offers={result.offers}
          guests={searchInput.guests}
          checkIn={searchInput.checkIn}
          checkOut={searchInput.checkOut}
          tripId={tripId}
        />
      </div>
    </>
  );
}
