import type { FlightOffer, FlightSearchParams, FlightSearchResult } from "./types";
import { getMockFlightOffers } from "./mock-data";
import { isDomesticRoute } from "./airports";
import { hasTime } from "./format";

// This is the direct replacement for the old site's flights3.js — same
// RapidAPI listing ("Google Flights2"), but called from the server instead
// of the browser, so the API key never reaches client-side JS. Everything
// in this file is the *only* place that knows about this specific
// provider's request/response shape; app/api/flights/search/route.ts and
// every UI component only ever see the normalized FlightOffer type from
// ./types.
const API_HOST = "google-flights2.p.rapidapi.com";
const API_BASE = `https://${API_HOST}`;

// The shape RapidAPI's "Google Flights2" listing actually returns. Typed
// loosely (lots of optional fields) on purpose: this is an unofficial,
// reverse-engineered endpoint, not a documented/versioned Google API, so
// it can add, rename, or drop fields without warning. Every read below
// uses optional chaining and a fallback for exactly that reason — a
// missing field should degrade a single offer, not crash the whole search.
type RawAirport = { time?: string };
type RawFlightSegment = {
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  aircraft?: string;
  departure_airport?: RawAirport;
  arrival_airport?: RawAirport;
};
type RawDuration = { text?: string; raw?: number };
type RawOffer = {
  price?: number;
  duration?: RawDuration;
  flights?: RawFlightSegment[];
};
type RawResponse = {
  status?: boolean;
  data?: {
    itineraries?: {
      topFlights?: RawOffer[];
      otherFlights?: RawOffer[];
    };
  };
};

// TEMP-DEBUG: the bare-clock-string fix (see BARE_TIME_PATTERN in
// lib/flights/format.ts) turned out not to be the whole story — after
// shipping it, a real search still showed "Time TBD" on every card, and
// this warning never fired even once. That combination only makes sense if
// segment.departure_airport?.time / arrival_airport?.time are actually
// undefined (or segment.departure_airport itself is undefined) on the real
// response, not just a different string format — meaning the field
// path/name guessed when this provider was first written was never
// actually confirmed against a live payload (unlike the hotel provider's
// fields, which did get that check — see HOW-IT-WORKS.md's Day 4 bug
// sections). warnIfUnexpectedTimeShape stays in case a *format* mismatch
// shows up later; logRawOfferOnce below is the one doing the real work
// right now — remove both once a live check confirms the correct field.
let loggedUnexpectedTimeShape = false;
function warnIfUnexpectedTimeShape(time: string | undefined) {
  if (!time || loggedUnexpectedTimeShape || hasTime(time)) return;
  loggedUnexpectedTimeShape = true;
  console.warn(
    "[flights] TEMP-DEBUG: unrecognized time value from Google Flights2 — please share this with whoever's maintaining lib/flights/format.ts:",
    JSON.stringify(time)
  );
}

// TEMP-DEBUG: dumps the very first raw offer object from a real response,
// once per server process, so its exact real shape can be read directly
// instead of guessed at — same technique that found both hotel-provider
// bugs in Day 4 (see HOW-IT-WORKS.md). Once a real console log confirms
// which field actually holds the per-leg time (if any), normalizeOffer
// below should read from there instead, and this whole block should come
// out.
let loggedRawOfferSample = false;
function logRawOfferOnce(rawOffers: RawOffer[]) {
  if (loggedRawOfferSample || rawOffers.length === 0) return;
  loggedRawOfferSample = true;
  console.warn(
    "[flights] TEMP-DEBUG: raw offer sample from Google Flights2 — copy this whole block back into chat:\n" +
      JSON.stringify(rawOffers[0], null, 2)
  );
}

function normalizeOffer(
  raw: RawOffer,
  index: number,
  params: FlightSearchParams
): FlightOffer | null {
  const firstSegment = raw.flights?.[0];
  if (!firstSegment || typeof raw.price !== "number") {
    // Missing the fields we actually need to render a card — skip this one
    // rather than showing a broken card.
    return null;
  }

  return {
    id: `google-flights-${index}`,
    price: raw.price,
    currency: "USD",
    durationText: raw.duration?.text ?? "Duration unknown",
    durationMinutes: raw.duration?.raw ?? 0,
    stops: Math.max((raw.flights?.length ?? 1) - 1, 0),
    segments: (raw.flights ?? []).map((segment) => {
      warnIfUnexpectedTimeShape(segment.departure_airport?.time);
      warnIfUnexpectedTimeShape(segment.arrival_airport?.time);
      return {
        airline: segment.airline ?? "Unknown airline",
        airlineLogo: segment.airline_logo ?? null,
        flightNumber: segment.flight_number ?? "—",
        aircraft: segment.aircraft ?? null,
        departureAirportCode: params.from,
        departureTime: segment.departure_airport?.time ?? "",
        arrivalAirportCode: params.to,
        arrivalTime: segment.arrival_airport?.time ?? "",
      };
    }),
  };
}

async function fetchFromGoogleFlights(
  params: FlightSearchParams
): Promise<FlightOffer[]> {
  const apiKey = process.env.RAPIDAPI_GOOGLE_FLIGHTS_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_GOOGLE_FLIGHTS_KEY is not set");
  }

  // This is always a single one-way leg request — the confirmed Day 3
  // shape, unchanged. A round trip is handled entirely above this file, as
  // two separate calls to searchFlights() (outbound leg, then return leg
  // with `from`/`to` swapped and the return date) — see
  // components/sections/flight-search-results.tsx and app/flights/page.tsx.
  // That keeps this provider simple and its request shape fully confirmed,
  // rather than guessing at an unconfirmed round-trip parameter convention.
  const query = new URLSearchParams({
    departure_id: params.from,
    arrival_id: params.to,
    outbound_date: params.date,
    currency: "USD",
    travel_class: "ECONOMY",
    adults: String(params.adults),
    limit: "50",
  });

  const res = await fetch(`${API_BASE}/api/v1/searchFlights?${query}`, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": API_HOST,
    },
    // Flight prices shift constantly and this endpoint is rate-limited on
    // free tiers, but a demo doesn't need per-second freshness — a short
    // cache means clicking back and forth between two searches during a
    // walkthrough doesn't burn quota.
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Google Flights2 responded with ${res.status}`);
  }

  const json: RawResponse = await res.json();
  if (!json.status) {
    throw new Error("Google Flights2 returned status: false");
  }

  const rawOffers = [
    ...(json.data?.itineraries?.topFlights ?? []),
    ...(json.data?.itineraries?.otherFlights ?? []),
  ];

  logRawOfferOnce(rawOffers);

  const offers = rawOffers
    .map((raw, i) => normalizeOffer(raw, i, params))
    .filter((offer): offer is FlightOffer => offer !== null);

  if (offers.length === 0) {
    throw new Error("Google Flights2 returned no usable offers");
  }

  return offers;
}

// REVERTED (Day 3, revisited, take 2): results are no longer filtered down
// to nonstop-only — that hid legitimate 1-stop flights with normal,
// reasonable durations, which was too broad a fix for what turned out to
// be a data-quality problem, not a stops problem.
//
// The actual bug being worked around: some "1 stop" results for a
// Philippine domestic route (confirmed live) came back with a duration of
// 22+ hours — nobody books a same-country connection with a full day's
// layover, so that's this reverse-engineered API returning bad data (most
// likely mixing in some multi-day/positioning itinerary it shouldn't), not
// a real flight anyone would pick anyway. `dropUnrealisticDurations` below
// targets that specific problem instead: it only applies to routes where
// both airports are Philippine (isDomesticRoute, lib/flights/airports.ts —
// a real long-haul international flight legitimately takes 12+ hours, so
// this check would be wrong to apply there), and only drops results over
// a generous 8-hour cap, well above what even a bad-layover domestic
// connection should ever take. A missing/zero duration is left alone
// rather than dropped, since we can't tell if that's bad data or just a
// field this API didn't populate for that result.
const MAX_DOMESTIC_DURATION_MINUTES = 8 * 60;

function dropUnrealisticDurations(
  offers: FlightOffer[],
  params: FlightSearchParams
): FlightOffer[] {
  if (!isDomesticRoute(params.from, params.to)) return offers;
  return offers.filter(
    (offer) =>
      offer.durationMinutes === 0 ||
      offer.durationMinutes <= MAX_DOMESTIC_DURATION_MINUTES
  );
}

export async function searchFlights(
  params: FlightSearchParams
): Promise<FlightSearchResult> {
  try {
    const offers = await fetchFromGoogleFlights(params);
    return { offers: dropUnrealisticDurations(offers, params), isFallback: false };
  } catch (error) {
    console.error("[flights] falling back to sample data:", error);
    // Mock data is synthetic and always well under the domestic duration
    // cap, so running it through dropUnrealisticDurations would be a no-op
    // — skipped here rather than calling it just to prove that.
    return { offers: getMockFlightOffers(params), isFallback: true };
  }
}
