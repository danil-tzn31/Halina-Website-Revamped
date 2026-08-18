import { Plane, Hotel as HotelIcon, Users } from "lucide-react";

import { BookingPrice } from "@/components/account/booking-price";
import { BoardingPassTrigger } from "@/components/account/boarding-pass-trigger";
import type { BoardingPassData } from "@/components/booking/boarding-pass-card";
import { formatDateLabel } from "@/lib/flights/format";

// One card per booking, deliberately built to look like a smaller sibling
// of FlightResultCard / the hotel result cards (border border-line,
// bg-paper-raised, h-full + flex-col + mt-auto footer for row alignment —
// see components/sections/flight-result-card.tsx's comment for why that
// combination matters) rather than a new visual language. The idea is that
// a booking should look recognizably like "the search result you picked,"
// just with a status badge and a receipt-style footer instead of a "Tap
// for details" prompt.
//
// This is a Server Component — same reasoning as BookingPrice's own
// comment: only the price actually needs useCurrency() (a Client-only
// hook), so only that one span is pulled out into a Client Component
// rather than converting this whole card.
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
  // Precomputed by app/account/bookings/page.tsx via the same
  // lib/flights/boarding-pass.ts helper /booking/success uses — null for
  // every booking that isn't a PAID flight with a cleanly-parsed route.
  // Computed there rather than inside this component because building it
  // needs the signed-in user's name (from the page's own `auth()` call),
  // which this card has no reason to fetch itself.
  boardingPass: BoardingPassData | null;
};

// `details` is a loosely-typed Prisma Json? column (see prisma/schema.prisma's
// comment on Booking.details) — it's whatever shape the modal that created
// the booking put there (flight-detail-modal.tsx or hotel-detail-modal.tsx),
// never guaranteed at the type level. Every field read from it below is
// optional-chained with a fallback for exactly that reason: a malformed or
// missing details blob should degrade to a plainer card, not crash the page.
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
        {/* Only a PAID flight booking whose route parsed cleanly ever gets
            a boardingPass — see lib/flights/boarding-pass.ts. Its own
            top border reads as a second divider, separating this action
            from the price row above it rather than crowding into it. */}
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

// Small uppercase pill, same rounded-full treatment already used for the
// icon circles in flight-result-card.tsx / flight-detail-modal.tsx — the
// one rounded shape in an otherwise sharp-cornered design language, so it
// reads as consistent with those rather than introducing a new shape.
// CANCELLED is included for completeness even though the page query
// filters those rows out (see app/account/bookings/page.tsx) — this
// component shouldn't assume that filtering will always be in place.
//
// Exported (not just used locally) because AdminBookingsTable (section 32)
// reuses this exact same pill next to its own status dropdown, rather than
// keeping a second copy of the same three-color mapping.
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
