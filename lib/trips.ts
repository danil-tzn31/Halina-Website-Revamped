import { AIRPORTS } from "@/lib/flights/airports";
import { addDaysISO } from "@/lib/date-utils";

// A few airports are named after the gateway town, not the place people
// actually stay. Searching hotels in "Kalibo" when the trip is really to
// Boracay would be a poor first suggestion, so these get swapped.
const STAY_NAME_OVERRIDES: Record<string, string> = {
  KLO: "Boracay",
  USU: "Coron",
  LAO: "Vigan",
  TAG: "Panglao",
  ENI: "El Nido",
};

// Turns an arrival airport code into a place name the hotel search
// understands. Falls back to the city before any "(...)" note, then to the
// raw code if the airport isn't in our list.
export function stayPlaceForAirport(code: string): string {
  if (STAY_NAME_OVERRIDES[code]) return STAY_NAME_OVERRIDES[code];
  const airport = AIRPORTS.find((a) => a.code === code);
  if (!airport) return code;
  return airport.city.split("(")[0].trim();
}

// "MNL → CEB" / "MNL ⇄ CEB" → "CEB". Same parsing as toBoardingPass().
export function arrivalCodeFromRoute(routeName: string): string | null {
  const parts = routeName.split(/→|⇄/).map((s) => s.trim());
  return parts.length === 2 && parts[1] ? parts[1] : null;
}

// Link to the hotel results page, filled in from a trip. A one-way flight
// has no return date, so it suggests two nights — easy to change in the
// search bar, which keeps the trip attached.
export function addHotelHref(trip: {
  id: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  guests: number;
}): string {
  const checkOut =
    trip.endDate > trip.startDate ? trip.endDate : addDaysISO(trip.startDate, 2);
  const params = new URLSearchParams({
    destination: stayPlaceForAirport(trip.destination),
    checkIn: trip.startDate,
    checkOut,
    guests: String(trip.guests),
    trip: trip.id,
  });
  return `/hotels?${params.toString()}`;
}
