import type { HotelOffer, HotelSearchParams, HotelSearchResult } from "./types";
import { getMockHotelOffers } from "./mock-data";

// ---------------------------------------------------------------------
// Uses the "Tripadvisor.com" RapidAPI listing, not "Tripadvisor Scraper" —
// that one's only search endpoint is a place/entity autocomplete with no
// price/rating fields, and its /hotels/list endpoint 502'd for smaller
// destinations.
//
// Two-step search:
//
//   1. GET /auto-complete?query=<place name>
//      Resolves a free-text place name to matches, each carrying a
//      `geoId`. Both places (city/region) and individual hotels show up
//      here — we want the place match (so we get every hotel in it),
//      preferring a "CITY"-tagged entry and falling back to the first
//      result otherwise.
//
//   2. GET /hotels/search?geoId=<geoId>&checkIn=<YYYY-MM-DD>&checkOut=<YYYY-MM-DD>
//      Real hotel availability search with prices/ratings/photos. Example
//      shape (geoId=60763/New York):
//        { data: { hotels: [ {
//          cardTitle: { string: "1. Crowne Plaza ..." },       // rank-prefixed
//          bubbleRating: { rating: 4.7, numberReviews: { string: "(2,312)" } },
//          commerceInfo: { priceForDisplay: { string: "$302" } },
//          cardPhotos: [ { sizes: { urlTemplate: "...{width}x{height}..." } } ],
//          cardLink: { route: { params: { contentId: 123456 } } },
//        } ... ] } }
//      No address/amenities fields exist in this shape, so both fall back
//      to null/[] rather than guessing at unconfirmed field names.
//
// Date format is YYYY-MM-DD, not the MM/DD/YYYY the playground's example
// request shows — sending MM/DD/YYYY gets an explicit validation error.
// Our form already collects dates in the correct format
// (lib/validators/hotel-search.ts).
// ---------------------------------------------------------------------
const API_HOST = "tripadvisor-com1.p.rapidapi.com";
const API_BASE = `https://${API_HOST}`;

type AutoCompleteItem = {
  geoId?: number | string;
  heading?: { htmlString?: string };
  // The place-type classification is nested here, not at the top level —
  // `trackingItems.placeType` is "ISLAND", "CITY", "HOTEL", etc. A search
  // for "Cebu" returns "Cebu Island" (ISLAND) before "Cebu City" (CITY);
  // the island's geoId has no hotel inventory on /hotels/search, which is
  // why picking the wrong one matters (see pickGeoId below).
  trackingItems?: { placeType?: string; locationId?: number | string };
};

type AutoCompleteResponse =
  | AutoCompleteItem[]
  | { data?: AutoCompleteItem[]; results?: AutoCompleteItem[] };

type RawHotel = {
  cardTitle?: { string?: string };
  bubbleRating?: {
    rating?: number;
    numberReviews?: { string?: string };
  };
  commerceInfo?: {
    priceForDisplay?: { string?: string };
  };
  cardPhotos?: { sizes?: { urlTemplate?: string } }[];
  cardLink?: { route?: { params?: { contentId?: number | string } } };
};

type HotelsSearchResponse = {
  data?: { hotels?: RawHotel[] };
};

function extractAutoCompleteItems(json: AutoCompleteResponse): AutoCompleteItem[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.results)) return json.results;
  return [];
}

function pickGeoId(items: AutoCompleteItem[]): string | null {
  if (items.length === 0) return null;

  const placeTypeOf = (item: AutoCompleteItem) =>
    (item.trackingItems?.placeType ?? "").toString().toUpperCase();

  // Prefer an actual CITY match over a broader region (ISLAND, GEO, etc.)
  // or a specific hotel entity — e.g. a "Cebu" search returns "Cebu
  // Island" first, but that geoId has no hotel inventory on
  // /hotels/search; "Cebu City" does. Falls back to any non-HOTEL place,
  // then the top result.
  const cityMatch = items.find((item) => placeTypeOf(item) === "CITY");
  const broaderPlaceMatch = items.find((item) => {
    const type = placeTypeOf(item);
    return type.length > 0 && type !== "HOTEL";
  });

  const chosen = cityMatch ?? broaderPlaceMatch ?? items[0];
  return chosen.geoId !== undefined && chosen.geoId !== null ? String(chosen.geoId) : null;
}

async function resolveGeoId(destination: string, apiKey: string): Promise<string | null> {
  const query = new URLSearchParams({ query: destination });

  const res = await fetch(`${API_BASE}/auto-complete?${query}`, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": process.env.HOTEL_API_HOST || API_HOST,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "<unreadable>");
    console.log(`[hotels] auto-complete error (${res.status}):`, errorBody.slice(0, 500));
    throw new Error(`Tripadvisor.com auto-complete responded with ${res.status}`);
  }

  const json: AutoCompleteResponse = await res.json();

  return pickGeoId(extractAutoCompleteItems(json));
}

function parsePrice(raw: RawHotel): number | null {
  const display = raw.commerceInfo?.priceForDisplay?.string;
  if (!display) return null;
  const numeric = Number(display.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function parseReviewCount(raw: RawHotel): number | null {
  const display = raw.bubbleRating?.numberReviews?.string;
  if (!display) return null;
  const numeric = Number(display.replace(/[^0-9]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function parsePhoto(raw: RawHotel): string | null {
  const template = raw.cardPhotos?.[0]?.sizes?.urlTemplate;
  if (!template) return null;
  return template.replace("{width}", "600").replace("{height}", "400");
}

function normalizeOffer(
  raw: RawHotel,
  index: number,
  params: HotelSearchParams
): HotelOffer | null {
  // cardTitle.string is rank-prefixed, e.g. "1. Crowne Plaza Times Square" —
  // strip the leading "N. " so the UI shows a clean hotel name.
  const rawName = raw.cardTitle?.string;
  const name = rawName?.replace(/^\d+\.\s*/, "").trim();
  const price = parsePrice(raw);
  if (!name || price === null) return null;

  return {
    id: String(raw.cardLink?.route?.params?.contentId ?? `tripadvisor-${index}`),
    name,
    city: params.destination,
    address: null,
    rating: raw.bubbleRating?.rating ?? null,
    reviewCount: parseReviewCount(raw),
    pricePerNight: price,
    currency: "USD",
    photo: parsePhoto(raw),
    amenities: [],
  };
}

async function fetchFromTripAdvisor(
  params: HotelSearchParams
): Promise<HotelOffer[]> {
  const apiKey = process.env.HOTEL_API_KEY;
  if (!apiKey) {
    throw new Error("HOTEL_API_KEY is not set");
  }

  const geoId = await resolveGeoId(params.destination, apiKey);
  if (!geoId) {
    throw new Error(`Could not resolve a geoId for "${params.destination}"`);
  }

  // Date format is YYYY-MM-DD despite the playground's MM/DD/YYYY example —
  // our form already collects dates in the correct format
  // (lib/validators/hotel-search.ts).
  const query = new URLSearchParams({
    geoId,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
  });

  const res = await fetch(`${API_BASE}/hotels/search?${query}`, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": process.env.HOTEL_API_HOST || API_HOST,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "<unreadable>");
    console.log(`[hotels] hotels/search error (${res.status}):`, errorBody.slice(0, 500));
    throw new Error(`Tripadvisor.com hotels/search responded with ${res.status}`);
  }

  const json: HotelsSearchResponse = await res.json();
  const rawHotels = json.data?.hotels ?? [];

  const offers = rawHotels
    .map((raw, i) => normalizeOffer(raw, i, params))
    .filter((offer): offer is HotelOffer => offer !== null);

  if (offers.length === 0) {
    throw new Error("Tripadvisor.com returned no usable offers");
  }

  return offers;
}

export async function searchHotels(
  params: HotelSearchParams
): Promise<HotelSearchResult> {
  try {
    const offers = await fetchFromTripAdvisor(params);
    return { offers, isFallback: false };
  } catch (error) {
    console.error("[hotels] falling back to sample data:", error);
    return { offers: getMockHotelOffers(params), isFallback: true };
  }
}
