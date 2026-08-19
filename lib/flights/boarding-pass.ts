import type { BoardingPassData } from "@/components/booking/boarding-pass-card";

// Shared by both places a boarding pass can appear: the one-time
// /booking/success confirmation and the "View boarding pass" action on My
// Bookings. Pulled out here rather than duplicated in both call sites so
// they always build the same object, the same way, from a booking row.
export type BoardingPassSourceBooking = {
  id: string;
  name: string; // "MNL → CEB" (one-way) or "MNL ⇄ CEB" (round trip)
  type: string;
  status: string;
  currency: string;
  price: number;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  guests: number;
  details: unknown;
};

// Returns null for anything that isn't a good fit for the boarding-pass
// treatment — a hotel booking, a booking that hasn't cleared payment, or a
// flight booking whose `name` doesn't parse into two airport codes.
// Callers fall back to the plain confirmation box rather than rendering a
// pass with a blank or wrong route.
export function toBoardingPass(
  booking: BoardingPassSourceBooking,
  passengerName: string
): BoardingPassData | null {
  if (booking.type !== "FLIGHT" || booking.status !== "PAID") return null;

  const [fromCode, toCode] = booking.name.split(/→|⇄/).map((s) => s.trim());
  if (!fromCode || !toCode) return null;

  return {
    id: booking.id,
    name: booking.name,
    price: booking.price,
    currency: booking.currency,
    dateFrom: booking.dateFrom,
    dateTo: booking.dateTo,
    guests: booking.guests,
    passengerName,
    fromCode,
    toCode,
    details: (booking.details ?? {}) as BoardingPassData["details"],
  };
}
