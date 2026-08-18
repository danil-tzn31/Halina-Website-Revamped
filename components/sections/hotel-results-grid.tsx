"use client";

import { useMemo, useState } from "react";

import { HotelResultCard } from "@/components/sections/hotel-result-card";
import { HotelDetailModal } from "@/components/booking/hotel-detail-modal";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SortSelect } from "@/components/ui/sort-select";
import { HOTEL_SORT_OPTIONS, sortHotelOffers, type HotelSortKey } from "@/lib/hotels/sort";
import type { HotelOffer } from "@/lib/hotels/types";
import { usePagination } from "@/lib/use-pagination";

export function HotelResultsGrid({
  offers,
  guests,
  checkIn,
  checkOut,
}: {
  offers: HotelOffer[];
  guests: number;
  checkIn: string;
  checkOut: string;
}) {
  const [selected, setSelected] = useState<HotelOffer | null>(null);
  const [sortKey, setSortKey] = useState<HotelSortKey>("default");
  const sortedOffers = useMemo(() => sortHotelOffers(offers, sortKey), [offers, sortKey]);
  // 20 cards per page rather than every offer at once — see
  // lib/use-pagination.ts for why.
  const { pageItems, page, totalPages, goToPrev, goToNext } = usePagination(sortedOffers);

  if (offers.length === 0) {
    return (
      <p className="text-[14px] text-ink-soft">
        No hotels found for that destination and dates.
      </p>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <PaginationControls page={page} totalPages={totalPages} onPrev={goToPrev} onNext={goToNext} />
        <div className="ml-auto">
          <SortSelect value={sortKey} onChange={setSortKey} options={HOTEL_SORT_OPTIONS} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((offer) => (
          <HotelResultCard key={offer.id} offer={offer} onSelect={setSelected} />
        ))}
      </div>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        className="mt-8"
      />
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
