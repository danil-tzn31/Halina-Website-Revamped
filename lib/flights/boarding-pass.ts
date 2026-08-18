import type { BoardingPassData } from "@/components/booking/boarding-pass-card";

// Shared by both places a boarding pass can appear: the one-time
// /booking/success confirmation (Halina-Revamp-Plan.md section 36) and the
// "View boarding pass" action on My Bookings that lets you come back to it
// later, added right after as a follow-up once section 36 itself was
// confirmed working. Pulled out here rather than left inline in
// app/booking/success/page.tsx (where it originally lived) so both call
// sites build the exact same object, the same way, from a booking row —
// the same "define it once" discipline already used for lib/photos.ts,
// lib/destinations/quiz.ts, and the flight/hotel sort comparators (section
// 21). If this logic ever needs to change (say, a new way a route could be
// stored), there's one function to fix, not two that could quietly drift
// apart.
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
// treatment — a hotel booking, a booking that hasn't actually cleared
// payment, or (defensively) a flight booking whose `name` doesn't parse
// into two airport codes the way every booking created through this app's
// own flow always does (see flight-detail-modal.tsx's `name:` line).
// Returning null rather than guessing lets every caller fall back to
// something honest (the plain confirmation box, or simply no "View
// boarding pass" button at all) instead of ever rendering a pass with a
// blank or wrong route.
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
