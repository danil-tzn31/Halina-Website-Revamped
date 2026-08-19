// Shared shape for a flight result, independent of which provider produced
// it. The route handler and every UI component only ever see this type,
// never the raw RapidAPI response — same adapter pattern used by the
// hotel provider (lib/hotels/). Swapping the underlying API means
// rewriting google-flights-provider.ts only.
export type FlightSegment = {
  airline: string;
  airlineLogo: string | null;
  flightNumber: string;
  aircraft: string | null;
  departureAirportCode: string;
  departureTime: string;
  arrivalAirportCode: string;
  arrivalTime: string;
};

export type FlightOffer = {
  id: string;
  price: number;
  currency: string;
  durationText: string;
  durationMinutes: number;
  stops: number;
  segments: FlightSegment[];
};

export type TripType = "one_way" | "round_trip";

// Deliberately still a one-way search shape — a round trip is modeled as
// two independent one-way searches (outbound from->to, return to->from),
// not one combined request. Mirrors how real booking sites work and keeps
// this provider's request shape simple.
export type FlightSearchParams = {
  from: string;
  to: string;
  date: string;
  adults: number;
};

export type FlightSearchResult = {
  offers: FlightOffer[];
  /** True when the real API couldn't be reached/parsed and this is the
   * small seeded fallback dataset instead — see lib/flights/mock-data.ts.
   * The UI surfaces this as a subtle notice rather than pretending these
   * are live prices. */
  isFallback: boolean;
};
