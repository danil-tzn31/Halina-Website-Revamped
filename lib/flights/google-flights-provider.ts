import type { FlightOffer, FlightSearchParams, FlightSearchResult } from "./types";
import { getMockFlightOffers } from "./mock-data";
import { isDomesticRoute } from "./airports";
import { hasTime } from "./format";

// Replaces the old site's flights3.js — same RapidAPI listing ("Google
// Flights2"), but called from the server instead of the browser, so the
// API key never reaches client-side JS. This file is the only place that
// knows the provider's request/response shape; everything else only ever
// sees the normalized FlightOffer type from ./types.
const API_HOST = "google-flights2.p.rapidapi.com";
const API_BASE = `https://${API_HOST}`;

// The shape RapidAPI's "Google Flights2" listing actually returns. Typed
// loosely (lots of optional fields) on purpose: this is an unofficial,
// reverse-engineered endpoint, so it can add, rename, or drop fields
// without warning. Every read below uses optional chaining and a fallback
// so a missing field degrades a single offer instead of crashing the search.
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

// TEMP-DEBUG: one-time warning if a time value doesn't match any known
// format. Kept alongside logRawOfferOnce below in case the field this API
// actually populates for time turns out to differ from what's assumed
// here — remove both once that's confirmed against production data.
let loggedUnexpectedTimeShape = false;
function warnIfUnexpectedTimeShape(time: string | undefined) {
  if (!time || loggedUnexpectedTimeShape || hasTime(time)) return;
  loggedUnexpectedTimeShape = true;
  console.warn(
    "[flights] TEMP-DEBUG: unrecognized time value from Google Flights2 — please share this with whoever's maintaining lib/flights/format.ts:",
    JSON.stringify(time)
  );
}

// TEMP-DEBUG: logs the first raw offer once per server process, so its
// exact shape can be inspected instead of guessed at. Once the field
// holding per-leg time is confirmed, normalizeOffer should read from
// there and this block should come out.
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

  // Always a single one-way leg request. A round trip is handled above
  // this file as two separate calls to searchFlights() (outbound, then
  // return with from/to swapped) — see flight-search-results.tsx and
  // app/flights/page.tsx. Keeps this provider's request shape simple
  // rather than guessing at a round-trip parameter convention.
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
    // free tiers — a short cache avoids burning quota when clicking back
    // and forth between searches.
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

// Results are not filtered to nonstop-only — that also hid legitimate
// 1-stop flights with normal durations. The actual problem: some "1 stop"
// results for Philippine domestic routes come back with a duration of 22+
// hours, which is bad data from this reverse-engineered API, not a real
// itinerary. dropUnrealisticDurations targets that instead: it only
// applies to domestic routes (isDomesticRoute, lib/flights/airports.ts —
// an international long-haul can legitimately take 12+ hours) and drops
// anything over a generous 8-hour cap. A missing/zero duration is left
// alone since it may just be an unpopulated field rather than bad data.
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
    // cap, so dropUnrealisticDurations would be a no-op here.
    return { offers: getMockFlightOffers(params), isFallback: true };
  }
}
