"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { HotelResultCard, HotelResultCardSkeleton } from "@/components/sections/hotel-result-card";
import { HotelDetailModal } from "@/components/booking/hotel-detail-modal";
import type { HotelOffer } from "@/lib/hotels/types";

type FetchedResult = { key: string; offers: HotelOffer[]; isFallback: boolean };
type FetchedError = { key: string; message: string };

// The hotels counterpart to FlightSearchResults — same fetch/derive-loading
// pattern, see that file's comments for why `loading` isn't its own piece
// of state.
export function HotelSearchResults({
  destination,
  checkIn,
  checkOut,
  guests,
}: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}) {
  const currentKey =
    destination && checkIn && checkOut
      ? `${destination}|${checkIn}|${checkOut}|${guests}`
      : null;

  const [result, setResult] = useState<FetchedResult | null>(null);
  const [fetchError, setFetchError] = useState<FetchedError | null>(null);
  const [selected, setSelected] = useState<HotelOffer | null>(null);

  useEffect(() => {
    if (!currentKey) return;

    const controller = new AbortController();
    fetch(
      `/api/hotels/search?destination=${encodeURIComponent(destination)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Search failed. Try again.");
        }
        return res.json();
      })
      .then((data: { offers: HotelOffer[]; isFallback: boolean }) => {
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
  }, [currentKey, destination, checkIn, checkOut, guests]);

  const loading = currentKey !== null && result?.key !== currentKey && fetchError?.key !== currentKey;
  const offers = result?.key === currentKey ? result.offers : null;
  const isFallback = result?.key === currentKey ? result.isFallback : false;
  const error = fetchError?.key === currentKey ? fetchError.message : null;

  const fullResultsHref = `/hotels?destination=${encodeURIComponent(destination)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-light text-ink">Hotels in {destination}</h2>
        {offers && offers.length > 0 && (
          <Link
            href={fullResultsHref}
            className="text-[13px] italic text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Show all results
          </Link>
        )}
      </div>

      {isFallback && (
        <p className="mt-2 text-[12.5px] italic text-sand">
          Showing sample results — the live hotel API didn&apos;t respond,
          so this is seeded demo data.
        </p>
      )}

      <div className="mt-6">
        {loading && (
          // Mobile padding is calc(50vw - 130px) — half the viewport width
          // minus half the 260px card width — so the first card sits
          // centered on screen right away instead of flush left with the
          // next one just peeking in. snap-center on each card (below)
          // keeps that same centered framing while swiping. This trades
          // away the "next card peeking in" affordance a flush-left layout
          // gave for free — deliberate, after feedback asked specifically
          // for centering.
          <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50vw-130px)] pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[260px] snap-center sm:min-w-0">
                <HotelResultCardSkeleton />
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-[14px] text-red-700">{error}</p>}
        {!loading && !error && offers && offers.length === 0 && (
          <p className="text-[14px] text-ink-soft">
            No hotels found for that destination and dates.
          </p>
        )}
        {!loading && offers && offers.length > 0 && (
          // Mobile padding is calc(50vw - 130px) — half the viewport width
          // minus half the 260px card width — so the first card sits
          // centered on screen right away instead of flush left with the
          // next one just peeking in. snap-center on each card (below)
          // keeps that same centered framing while swiping. This trades
          // away the "next card peeking in" affordance a flush-left layout
          // gave for free — deliberate, after feedback asked specifically
          // for centering.
          <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50vw-130px)] pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {offers.slice(0, 8).map((offer) => (
              <div key={offer.id} className="min-w-[260px] snap-center sm:min-w-0">
                <HotelResultCard offer={offer} onSelect={setSelected} />
              </div>
            ))}
          </div>
        )}
      </div>

      <HotelDetailModal
        offer={selected}
        guests={guests}
        checkIn={checkIn}
        checkOut={checkOut}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
