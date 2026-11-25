import type { FlightOffer, FlightSearchParams } from "./types";

// Backup flight source, used only when the RapidAPI provider comes back
// empty or fails (see searchFlights() in google-flights-provider.ts).
// SerpApi reads the same Google Flights data, but it found routes the main
// provider kept missing, like Seoul → Manila and Manila → Tokyo. The free
// plan is 250 searches a month, which is why it isn't the main source.
const API_URL = "https://serpapi.com/search.json";

// Only the fields we use. Typed loosely, like the main provider, so a
// missing field skips one offer instead of breaking the search.
type RawAirport = { id?: string; time?: string };
type RawSegment = {
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  airplane?: string;
  departure_airport?: RawAirport;
  arrival_airport?: RawAirport;
};
type RawOffer = {
  price?: number;
  total_duration?: number; // minutes
  flights?: RawSegment[];
};
type RawResponse = {
  error?: string;
  best_flights?: RawOffer[];
  other_flights?: RawOffer[];
};

// 195 → "3 hr 15 min", close to how the main provider words it.
function formatDuration(minutes: number): string {
  if (!minutes) return "Duration unknown";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

function normalizeOffer(
  raw: RawOffer,
  index: number,
  params: FlightSearchParams
): FlightOffer | null {
  const segments = raw.flights ?? [];
  if (segments.length === 0 || typeof raw.price !== "number") return null;

  return {
    id: `serpapi-${index}`,
    price: raw.price,
    currency: "USD",
    durationText: formatDuration(raw.total_duration ?? 0),
    durationMinutes: raw.total_duration ?? 0,
    stops: segments.length - 1,
    segments: segments.map((segment) => ({
      airline: segment.airline ?? "Unknown airline",
      airlineLogo: segment.airline_logo ?? null,
      flightNumber: segment.flight_number ?? "—",
      aircraft: segment.airplane ?? null,
      departureAirportCode: segment.departure_airport?.id ?? params.from,
      departureTime: segment.departure_airport?.time ?? "",
      arrivalAirportCode: segment.arrival_airport?.id ?? params.to,
      arrivalTime: segment.arrival_airport?.time ?? "",
    })),
  };
}

export async function fetchFromSerpApi(params: FlightSearchParams): Promise<FlightOffer[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_KEY is not set");
  }

  const query = new URLSearchParams({
    engine: "google_flights",
    departure_id: params.from,
    arrival_id: params.to,
    outbound_date: params.date,
    type: "2", // one way; a round trip is two separate searches
    adults: String(params.adults),
    currency: "USD",
    hl: "en",
    gl: "ph",
    api_key: apiKey,
  });

  // Cached a bit longer than the main provider's 60s, since every miss
  // here spends one of the 250 monthly searches.
  const res = await fetch(`${API_URL}?${query}`, { next: { revalidate: 600 } });
  const json: RawResponse = await res.json().catch(() => ({}));

  if (!res.ok || json.error) {
    throw new Error(`SerpApi: ${json.error ?? `responded with ${res.status}`}`);
  }

  const offers = [...(json.best_flights ?? []), ...(json.other_flights ?? [])]
    .map((raw, i) => normalizeOffer(raw, i, params))
    .filter((offer): offer is FlightOffer => offer !== null);

  if (offers.length === 0) {
    throw new Error("SerpApi returned no usable offers");
  }

  return offers;
}
