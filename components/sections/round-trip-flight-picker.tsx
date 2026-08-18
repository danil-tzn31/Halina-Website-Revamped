"use client";

import { useMemo, useState } from "react";

import { FlightResultCard, FlightResultCardSkeleton } from "@/components/sections/flight-result-card";
import { FlightDetailModal } from "@/components/booking/flight-detail-modal";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SortSelect } from "@/components/ui/sort-select";
import { useCurrency } from "@/lib/currency/currency-context";
import { formatDateLabel, formatTime } from "@/lib/flights/format";
import { FLIGHT_SORT_OPTIONS, sortFlightOffers, type FlightSortKey } from "@/lib/flights/sort";
import type { FlightOffer } from "@/lib/flights/types";
import { usePagination } from "@/lib/use-pagination";

// Real flight-booking sites don't show one combined "round trip" result —
// they have you pick a departure flight first, then pick a return flight
// second (each leg has its own price, schedule, and stop count; combining
// them into one search result would mean guessing at a request shape this
// API was never confirmed to support — see HOW-IT-WORKS.md). This
// component is the two-step version of that flow: it's handed two
// independent one-way result sets (the outbound leg and the return leg,
// each fetched exactly like a normal one-way search) and manages which
// step the user is on locally. Both FlightSearchResults (homepage
// carousel) and FlightResultsGrid (full /flights page) use this for
// tripType === "round_trip"; one-way search never touches this file.
type Step = "outbound" | "return";

export function RoundTripFlightPicker({
  fromCode,
  toCode,
  departDate,
  returnDate,
  guests,
  outboundOffers,
  returnOffers,
  outboundLoading,
  returnLoading,
  outboundError,
  returnError,
  outboundIsFallback,
  returnIsFallback,
  limit,
}: {
  fromCode: string;
  toCode: string;
  departDate: string;
  returnDate: string;
  guests: number;
  outboundOffers: FlightOffer[] | null;
  returnOffers: FlightOffer[] | null;
  outboundLoading: boolean;
  returnLoading: boolean;
  outboundError: string | null;
  returnError: string | null;
  outboundIsFallback: boolean;
  returnIsFallback: boolean;
  /** Cap the number of cards shown (the homepage carousel caps at 8, same
   * as one-way search) — omit for the full results page, which shows
   * everything. */
  limit?: number;
}) {
  const [step, setStep] = useState<Step>("outbound");
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOffer | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<FlightOffer | null>(null);
  const [sortKey, setSortKey] = useState<FlightSortKey>("default");
  const { formatPrice } = useCurrency();

  function chooseOutbound(offer: FlightOffer) {
    setSelectedOutbound(offer);
    setSelectedReturn(null);
    setStep("return");
  }

  function changeDeparture() {
    setSelectedOutbound(null);
    setSelectedReturn(null);
    setStep("outbound");
  }

  // Closing the modal without confirming just clears the return pick,
  // dropping back to the return-selection step — no reason to make someone
  // re-pick their departure flight too just because they changed their
  // mind about the return.
  function closeModal() {
    setSelectedReturn(null);
  }

  // Sort the full offer list before slicing to `limit` (rather than the
  // other way around), so the homepage carousel's capped 8 cards are the
  // top 8 under whichever sort is selected, not just the first 8 of the
  // provider's own order with sorting applied only within that subset.
  const sortedOutbound = useMemo(
    () => (outboundOffers ? sortFlightOffers(outboundOffers, sortKey) : null),
    [outboundOffers, sortKey]
  );
  const sortedReturn = useMemo(
    () => (returnOffers ? sortFlightOffers(returnOffers, sortKey) : null),
    [returnOffers, sortKey]
  );
  const visibleOutbound = limit ? sortedOutbound?.slice(0, limit) ?? null : sortedOutbound;
  const visibleReturn = limit ? sortedReturn?.slice(0, limit) ?? null : sortedReturn;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12.5px] uppercase tracking-wide text-ink-soft">
          <StepLabel active={step === "outbound"} done={Boolean(selectedOutbound)} label="1. Departure" />
          <span className="text-ink-soft/40">—</span>
          <StepLabel active={step === "return"} done={Boolean(selectedReturn)} label="2. Return" />
        </div>
        <SortSelect value={sortKey} onChange={setSortKey} options={FLIGHT_SORT_OPTIONS} />
      </div>

      {step === "outbound" && (
        <>
          <h3 className="text-lg text-ink">Choose your departure flight</h3>
          <p className="mt-1 text-[13px] text-ink-soft">
            {fromCode} <span className="text-ink-soft/60">→</span> {toCode} ·{" "}
            {formatDateLabel(departDate)}
          </p>
          <ResultsList
            offers={visibleOutbound}
            loading={outboundLoading}
            error={outboundError}
            isFallback={outboundIsFallback}
            onSelect={chooseOutbound}
          />
        </>
      )}

      {step === "return" && (
        <>
          {selectedOutbound && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border border-line bg-paper-raised px-4 py-3">
              <p className="text-[13px] text-ink">
                <span className="text-ink-soft">Departure selected — </span>
                {selectedOutbound.segments[0]?.airline} ·{" "}
                {formatTime(selectedOutbound.segments[0]?.departureTime ?? "")} ·{" "}
                {formatPrice(selectedOutbound.price, selectedOutbound.currency)}
              </p>
              <button
                type="button"
                onClick={changeDeparture}
                className="text-[12.5px] italic text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Change
              </button>
            </div>
          )}
          <h3 className="text-lg text-ink">Choose your return flight</h3>
          <p className="mt-1 text-[13px] text-ink-soft">
            {toCode} <span className="text-ink-soft/60">→</span> {fromCode} ·{" "}
            {formatDateLabel(returnDate)}
          </p>
          <ResultsList
            offers={visibleReturn}
            loading={returnLoading}
            error={returnError}
            isFallback={returnIsFallback}
            onSelect={setSelectedReturn}
          />
        </>
      )}

      <FlightDetailModal
        offer={selectedReturn ? selectedOutbound : null}
        returnOffer={selectedReturn}
        guests={guests}
        date={departDate}
        returnDate={returnDate}
        onClose={closeModal}
      />
    </div>
  );
}

function StepLabel({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span className={active || done ? "text-ink" : "text-ink-soft/60"}>{label}</span>
  );
}

// Shared loading/error/empty/grid rendering for both steps — pulled out
// rather than duplicated since outbound and return only ever differ in
// which offers/loading/error values they're showing, not in how those
// states render.
function ResultsList({
  offers,
  loading,
  error,
  isFallback,
  onSelect,
}: {
  offers: FlightOffer[] | null;
  loading: boolean;
  error: string | null;
  isFallback: boolean;
  onSelect: (offer: FlightOffer) => void;
}) {
  // 20 cards per page rather than every offer at once — see
  // lib/use-pagination.ts for why. The homepage carousel already caps
  // `offers` at 8 (via the `limit` prop above) before it ever reaches here,
  // so totalPages there is always 1 and PaginationControls renders nothing
  // — this only actually kicks in on the full /flights results page, and
  // resets to page 1 independently for the outbound and return steps since
  // each step calls ResultsList (and therefore this hook) separately.
  const { pageItems, page, totalPages, goToPrev, goToNext } = usePagination(offers ?? []);

  return (
    <div className="mt-4">
      {isFallback && (
        <p className="mb-3 text-[12.5px] italic text-sand">
          Showing sample results — the live flight API didn&apos;t respond,
          so this is seeded demo data.
        </p>
      )}
      {loading && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <FlightResultCardSkeleton key={i} />
          ))}
        </div>
      )}
      {error && <p className="text-[14px] text-red-700">{error}</p>}
      {!loading && !error && offers && offers.length === 0 && (
        <p className="text-[14px] text-ink-soft">No flights found for that route and date.</p>
      )}
      {!loading && offers && offers.length > 0 && (
        <>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrev={goToPrev}
            onNext={goToNext}
            className="mb-4"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((offer) => (
              <FlightResultCard key={offer.id} offer={offer} onSelect={onSelect} />
            ))}
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrev={goToPrev}
            onNext={goToNext}
            className="mt-8"
          />
        </>
      )}
    </div>
  );
}
