"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { FlightResultCard, FlightResultCardSkeleton } from "@/components/sections/flight-result-card";
import { FlightDetailModal } from "@/components/booking/flight-detail-modal";
import { RoundTripFlightPicker } from "@/components/sections/round-trip-flight-picker";
import { formatDateLabel } from "@/lib/flights/format";
import type { FlightOffer, TripType } from "@/lib/flights/types";

type FetchedResult = { key: string; offers: FlightOffer[]; isFallback: boolean };
type FetchedError = { key: string; message: string };

// One leg's fetch-and-derive-state cycle, factored out of the component
// below so a round trip's outbound and return legs (two independent
// one-way searches — see RoundTripFlightPicker for why round trips are
// modeled as two separate searches rather than one combined request)
// don't need this effect written out twice. `loading` is derived rather
// than stored as its own setState call for the same react-hooks/
// set-state-in-effect reason documented in HOW-IT-WORKS.md's Day 3
// section — every actual setState here happens inside the fetch's own
// .then()/.catch(), never synchronously in the effect body.
function useLegSearch(from: string, to: string, date: string, adults: number) {
  const currentKey = from && to && date ? `${from}|${to}|${date}|${adults}` : null;
  const [result, setResult] = useState<FetchedResult | null>(null);
  const [fetchError, setFetchError] = useState<FetchedError | null>(null);

  useEffect(() => {
    if (!currentKey) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ from, to, date, adults: String(adults) });

    fetch(`/api/flights/search?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Search failed. Try again.");
        }
        return res.json();
      })
      .then((data: { offers: FlightOffer[]; isFallback: boolean }) => {
        setResult({ key: currentKey, offers: data.offers, isFallback: data.isFallback });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setFetchError({
            key: currentKey,
            message: err instanceof Error ? err.message : "Search failed.",
          });
        }
      });

    return () => controller.abort();
  }, [currentKey, from, to, date, adults]);

  return {
    loading: currentKey !== null && result?.key !== currentKey && fetchError?.key !== currentKey,
    offers: result?.key === currentKey ? result.offers : null,
    isFallback: result?.key === currentKey ? result.isFallback : false,
    error: fetchError?.key === currentKey ? fetchError.message : null,
  };
}

// Extracted out of SearchResultsSection so the hotels half (see
// HotelSearchResults) doesn't have to share one file's worth of generic
// "which type is this" branching — each search type owns its full
// fetch-render-modal cycle independently.
export function FlightSearchResults({
  from,
  to,
  date,
  adults,
  tripType,
  returnDate,
}: {
  from: string;
  to: string;
  date: string;
  adults: number;
  tripType: TripType;
  returnDate?: string;
}) {
  const isRoundTrip = tripType === "round_trip" && Boolean(returnDate);

  // Outbound leg is always the plain from->to search. The return leg is
  // just another one-way search with from/to swapped and the return date
  // — useLegSearch's own from/to/date guard means it simply doesn't fetch
  // anything when this isn't actually a round trip (empty strings below).
  const outbound = useLegSearch(from, to, date, adults);
  const returnLeg = useLegSearch(
    isRoundTrip ? to : "",
    isRoundTrip ? from : "",
    isRoundTrip ? returnDate ?? "" : "",
    adults
  );

  const [selected, setSelected] = useState<FlightOffer | null>(null);

  const fullResultsParams = new URLSearchParams({ from, to, date, adults: String(adults), tripType });
  if (isRoundTrip && returnDate) {
    fullResultsParams.set("returnDate", returnDate);
  }
  const fullResultsHref = `/flights?${fullResultsParams.toString()}`;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-2xl font-light text-ink">
            {from} <span className="text-ink-soft">→</span> {to}
          </h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            {isRoundTrip && returnDate
              ? `${formatDateLabel(date)} – ${formatDateLabel(returnDate)}`
              : formatDateLabel(date)}
          </p>
        </div>
        {outbound.offers && outbound.offers.length > 0 && (
          <Link
            href={fullResultsHref}
            className="text-[13px] italic text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Show all results
          </Link>
        )}
      </div>

      <div className="mt-6">
        {isRoundTrip ? (
          <RoundTripFlightPicker
            fromCode={from}
            toCode={to}
            departDate={date}
            returnDate={returnDate ?? ""}
            guests={adults}
            outboundOffers={outbound.offers}
            returnOffers={returnLeg.offers}
            outboundLoading={outbound.loading}
            returnLoading={returnLeg.loading}
            outboundError={outbound.error}
            returnError={returnLeg.error}
            outboundIsFallback={outbound.isFallback}
            returnIsFallback={returnLeg.isFallback}
            limit={8}
          />
        ) : (
          <>
            {outbound.isFallback && (
              <p className="mb-3 text-[12.5px] italic text-sand">
                Showing sample results — the live flight API didn&apos;t
                respond, so this is seeded demo data.
              </p>
            )}
            {outbound.loading && (
              // Mobile padding is `calc(50vw - 130px)` (half the viewport
              // width minus half the 260px card width) instead of a flat
              // px-6, so the first card sits centered in the screen the
              // moment this loads, rather than flush against the left
              // padding with the next card only peeking in on the right.
              // `snap-center` on each card (below) keeps that same
              // centered framing as you swipe through the rest, instead of
              // snapping each one flush left. This does trade away the
              // "next card peeking in" hint that a flush-left layout gave
              // for free — a deliberate choice after feedback asked
              // specifically for centering, not a side effect.
              <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50vw-130px)] pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[260px] snap-center sm:min-w-0">
                    <FlightResultCardSkeleton />
                  </div>
                ))}
              </div>
            )}
            {outbound.error && <p className="text-[14px] text-red-700">{outbound.error}</p>}
            {!outbound.loading && !outbound.error && outbound.offers && outbound.offers.length === 0 && (
              <p className="text-[14px] text-ink-soft">
                No flights found for that route and date.
              </p>
            )}
            {!outbound.loading && outbound.offers && outbound.offers.length > 0 && (
              // Mobile padding is `calc(50vw - 130px)` (half the viewport
              // width minus half the 260px card width) instead of a flat
              // px-6, so the first card sits centered in the screen the
              // moment this loads, rather than flush against the left
              // padding with the next card only peeking in on the right.
              // `snap-center` on each card (below) keeps that same
              // centered framing as you swipe through the rest, instead of
              // snapping each one flush left. This does trade away the
              // "next card peeking in" hint that a flush-left layout gave
              // for free — a deliberate choice after feedback asked
              // specifically for centering, not a side effect.
              <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50vw-130px)] pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                {outbound.offers.slice(0, 8).map((offer) => (
                  <div key={offer.id} className="min-w-[260px] snap-center sm:min-w-0">
                    <FlightResultCard offer={offer} onSelect={setSelected} />
                  </div>
                ))}
              </div>
            )}
            <FlightDetailModal
              offer={selected}
              guests={adults}
              date={date}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </div>
    </>
  );
}
