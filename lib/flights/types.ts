// Shared shape for a flight result, independent of which provider produced
// it. The route handler and every UI component only ever see this type —
// they never touch the raw RapidAPI response shape directly. That's the
// same "adapter" idea the hotel provider will use once its API is ready
// (see lib/hotels/ later): swapping the underlying flights API to a
// different RapidAPI listing, or a different provider entirely, means
// rewriting google-flights-provider.ts only — every component below stays
// untouched.
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

// This is deliberately still just a one-way search shape — a round trip is
// modeled as two independent one-way searches (outbound leg from->to on
// `date`, return leg to->from on the return date), not one combined
// request. See HOW-IT-WORKS.md's "round trip is two one-way searches"
// section for why: it mirrors how real booking sites actually work
// (choose your departure flight, then choose your return flight) and it
// means this provider never has to guess at an unconfirmed round-trip
// request shape — every request it sends is the exact one-way shape
// confirmed back on Day 3.
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
