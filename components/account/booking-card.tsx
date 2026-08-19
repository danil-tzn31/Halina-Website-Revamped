import { Plane, Hotel as HotelIcon, Users } from "lucide-react";

import { BookingPrice } from "@/components/account/booking-price";
import { BoardingPassTrigger } from "@/components/account/boarding-pass-trigger";
import type { BoardingPassData } from "@/components/booking/boarding-pass-card";
import { formatDateLabel } from "@/lib/flights/format";

// Styled to match FlightResultCard / the hotel result cards (border,
// raised background, footer pinned via mt-auto) so a booking reads as
// "the search result you picked," with a status badge and receipt-style
// footer instead of a "Tap for details" prompt.
//
// Server Component — only BookingPrice needs the client-only useCurrency
// hook, so that's the only piece pulled out.
export type BookingCardData = {
  id: string;
  name: string;
  type: string;
  status: string;
  currency: string;
  price: number;
  dateFrom: string;
  dateTo: string;
  guests: number;
  details: unknown;
  // Precomputed in app/account/bookings/page.tsx (needs the signed-in
  // user's name); null unless the booking is a PAID flight with a
  // cleanly-parsed route. See lib/flights/boarding-pass.ts.
  boardingPass: BoardingPassData | null;
};

// `details` is a loosely-typed Prisma Json? column, shaped by whichever
// modal created the booking. Every field below is optional-chained so a
// malformed or missing blob degrades gracefully instead of crashing.
type FlightDetails = {
  tripType?: "one_way" | "round_trip";
  outbound?: { airline?: string; flightNumber?: string; stops?: number };
  return?: { airline?: string; flightNumber?: string; stops?: number };
};

type HotelDetails = {
  city?: string;
  nights?: number;
  pricePerNight?: number;
};

function stopsLabel(stops?: number): string | null {
  if (stops === undefined) return null;
  return stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`;
}

export function BookingCard({ booking }: { booking: BookingCardData }) {
  const isFlight = booking.type === "FLIGHT";
  const details = (booking.details ?? {}) as FlightDetails & HotelDetails;

  const sameDate = booking.dateFrom === booking.dateTo;
  const dateRange = sameDate
    ? formatDateLabel(booking.dateFrom)
    : `${formatDateLabel(booking.dateFrom)} → ${formatDateLabel(booking.dateTo)}`;

  return (
    <div className="flex h-full w-full flex-col border border-line bg-paper-raised">
      <div className="flex w-full items-center justify-between gap-2 p-4 pb-3">
        <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-ink-soft">
          {isFlight ? (
            <Plane className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          ) : (
            <HotelIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          )}
          {isFlight ? (details.tripType === "round_trip" ? "Round trip" : "Flight") : "Hotel"}
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="w-full px-4 pb-3">
        <p className="text-[16px] text-ink">{booking.name}</p>
        <p className="mt-1 text-[13px] text-ink-soft">{dateRange}</p>
      </div>

      <div className="w-full px-4 pb-4 text-[13px] text-ink-soft">
        {isFlight ? (
          <FlightSummary details={details} />
        ) : (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span>
              {details.nights ? `${details.nights} night${details.nights > 1 ? "s" : ""} · ` : ""}
              {booking.guests} guest{booking.guests > 1 ? "s" : ""}
              {details.city ? ` · ${details.city}` : ""}
            </span>
          </div>
        )}
      </div>

      <div className="mt-auto w-full border-t border-line">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3">
          <span className="text-[12.5px] italic text-ink-soft">
            {booking.status === "PENDING" ? "Awaiting payment" : "Booking total"}
          </span>
          <span className="text-[19px] text-ink">
            <BookingPrice amount={booking.price} currency={booking.currency} />
          </span>
        </div>
        {/* Only PAID flights with a cleanly-parsed route get a boardingPass. */}
        {booking.boardingPass && <BoardingPassTrigger boardingPass={booking.boardingPass} />}
      </div>
    </div>
  );
}

function FlightSummary({ details }: { details: FlightDetails }) {
  const outboundStops = stopsLabel(details.outbound?.stops);
  return (
    <div className="space-y-1">
      {details.outbound?.airline && (
        <p>
          {details.outbound.airline}
          {details.outbound.flightNumber ? ` · ${details.outbound.flightNumber}` : ""}
          {outboundStops ? ` · ${outboundStops}` : ""}
        </p>
      )}
      {details.return?.airline && (
        <p className="text-ink-soft/80">
          Return: {details.return.airline}
          {details.return.flightNumber ? ` · ${details.return.flightNumber}` : ""}
          {stopsLabel(details.return.stops) ? ` · ${stopsLabel(details.return.stops)}` : ""}
        </p>
      )}
    </div>
  );
}

// Small uppercase pill; rounded-full matches the icon circles used
// elsewhere. CANCELLED is included even though the page query filters
// those rows out — don't assume that filtering stays in place.
//
// Exported since AdminBookingsTable reuses this same pill for its status
// dropdown.
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-teal/15 text-teal",
    PENDING: "bg-sand/20 text-sand",
    CANCELLED: "bg-ink/10 text-ink-soft",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11.5px] uppercase tracking-wide ${
        styles[status] ?? "bg-ink/10 text-ink-soft"
      }`}
    >
      {status.toLowerCase()}
    </span>
  );
}
