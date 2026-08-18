"use client";

import { useMemo, useState } from "react";

import { FlightResultCard } from "@/components/sections/flight-result-card";
import { FlightDetailModal } from "@/components/booking/flight-detail-modal";
import { RoundTripFlightPicker } from "@/components/sections/round-trip-flight-picker";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SortSelect } from "@/components/ui/sort-select";
import { FLIGHT_SORT_OPTIONS, sortFlightOffers, type FlightSortKey } from "@/lib/flights/sort";
import type { FlightOffer, TripType } from "@/lib/flights/types";
import { usePagination } from "@/lib/use-pagination";

// The full-results-page counterpart to the homepage's carousel — same
// cards and click-opens-a-modal behavior for one-way search, and the same
// two-step RoundTripFlightPicker for round trips (see that component for
// why round trips are "pick departure, then pick return" instead of one
// combined result). Needs to be a client component because it owns the
// "which card/step is selected" state; app/flights/page.tsx itself stays a
// Server Component that does the data fetching — for a round trip, both
// legs are fetched server-side up front (two searchFlights() calls) rather
// than on demand, since there's no reason to make the browser wait on a
// second round-trip once the server already has both results.
export function FlightResultsGrid({
  tripType,
  fromCode,
  toCode,
  date,
  returnDate,
  guests,
  outboundOffers,
  returnOffers,
  outboundIsFallback,
  returnIsFallback,
}: {
  tripType: TripType;
  fromCode: string;
  toCode: string;
  date: string;
  returnDate?: string;
  guests: number;
  outboundOffers: FlightOffer[];
  returnOffers?: FlightOffer[];
  outboundIsFallback: boolean;
  returnIsFallback?: boolean;
}) {
  const [selected, setSelected] = useState<FlightOffer | null>(null);
  const [sortKey, setSortKey] = useState<FlightSortKey>("default");
  const sortedOffers = useMemo(
    () => sortFlightOffers(outboundOffers, sortKey),
    [outboundOffers, sortKey]
  );
  // 20 cards per page rather than every offer at once — see
  // lib/use-pagination.ts for why. Only used by the one-way branch below;
  // the round-trip branch returns early into RoundTripFlightPicker, which
  // paginates its own two steps independently.
  const { pageItems, page, totalPages, goToPrev, goToNext } = usePagination(sortedOffers);

  if (tripType === "round_trip" && returnDate) {
    return (
      <RoundTripFlightPicker
        fromCode={fromCode}
        toCode={toCode}
        departDate={date}
        returnDate={returnDate}
        guests={guests}
        outboundOffers={outboundOffers}
        returnOffers={returnOffers ?? []}
        outboundLoading={false}
        returnLoading={false}
        outboundError={null}
        returnError={null}
        outboundIsFallback={outboundIsFallback}
        returnIsFallback={returnIsFallback ?? false}
      />
    );
  }

  if (outboundOffers.length === 0) {
    return (
      <p className="text-[14px] text-ink-soft">
        No flights found for that route and date.
      </p>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <PaginationControls page={page} totalPages={totalPages} onPrev={goToPrev} onNext={goToNext} />
        <div className="ml-auto">
          <SortSelect value={sortKey} onChange={setSortKey} options={FLIGHT_SORT_OPTIONS} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((offer) => (
          <FlightResultCard key={offer.id} offer={offer} onSelect={setSelected} />
        ))}
      </div>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        className="mt-8"
      />
      <FlightDetailModal
        offer={selected}
        guests={guests}
        date={date}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
