"use client";

import { useSearchParams } from "next/navigation";

import { FlightSearchResults } from "@/components/sections/flight-search-results";
import { HotelSearchResults } from "@/components/sections/hotel-search-results";

// Lives on the homepage, right below the hero. Reads the query string the
// search bar just pushed (?type=flights&... or ?type=hotels&...) and hands
// off to whichever search type's own component — each owns its full
// fetch/loading/modal cycle independently (see FlightSearchResults and
// HotelSearchResults). Needs a Suspense boundary above it in app/page.tsx
// because useSearchParams requires one, same reason as AuthQueryListener.
export function SearchResultsSection() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  if (!type) return null;

  return (
    <section
      id="search-results"
      className="mx-auto w-full max-w-[1180px] scroll-mt-10 px-6 py-16 sm:px-10"
    >
      {type === "flights" ? (
        <FlightSearchResults
          from={searchParams.get("from") ?? ""}
          to={searchParams.get("to") ?? ""}
          date={searchParams.get("date") ?? ""}
          adults={Number(searchParams.get("adults") ?? "1")}
          tripType={searchParams.get("tripType") === "round_trip" ? "round_trip" : "one_way"}
          returnDate={searchParams.get("returnDate") ?? undefined}
        />
      ) : (
        <HotelSearchResults
          destination={searchParams.get("destination") ?? ""}
          checkIn={searchParams.get("checkIn") ?? ""}
          checkOut={searchParams.get("checkOut") ?? ""}
          guests={Number(searchParams.get("guests") ?? "2")}
        />
      )}
    </section>
  );
}
