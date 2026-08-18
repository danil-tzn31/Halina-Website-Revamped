import type { HotelOffer, HotelSearchParams, HotelSearchResult } from "./types";
import { getMockHotelOffers } from "./mock-data";

// ---------------------------------------------------------------------
// PROVIDER SWITCHED: "Tripadvisor Scraper" -> "Tripadvisor.com".
//
// The previous provider (tripadvisor-scraper.p.rapidapi.com) turned out to
// have no path to real pricing: its one search endpoint is a place/entity
// autocomplete with no price/rating/review fields on any result, and its
// second endpoint (/hotels/list) 502'd for smaller destinations (Tagaytay,
// Panglao) because it scrapes a live Tripadvisor page and that scrape
// sometimes fails upstream. Confirmed directly in the RapidAPI playground
// for this new host that it has a real, two-step, date-aware search:
//
//   1. GET /auto-complete?query=<place name>
//      Resolves a free-text place name to a list of matches, each carrying
//      a `geoId` — both places (city/region, placeType "CITY") and
//      individual named hotels show up here with their own geoId. We want
//      the *place* match (so we get every hotel in that place), not a
//      specific hotel entity, so we prefer a "CITY"-like entry and only
//      fall back to the first result if none is tagged that way.
//      Real example (query="Tagaytay"): geoId 317121 for the city itself,
//      plus hotel entities like "Summit Ridge Tagaytay" (geoId 1485031).
//
//   2. GET /hotels/search?geoId=<geoId>&checkIn=<YYYY-MM-DD>&checkOut=<YYYY-MM-DD>
//      A genuine hotel availability search — unlike the old provider, this
//      one needs dates, and returns real prices/ratings/photos. Confirmed
//      shape (real example, geoId=60763/New York):
//        { data: { hotels: [ {
//          cardTitle: { string: "1. Crowne Plaza ..." },       // rank-prefixed
//          bubbleRating: { rating: 4.7, numberReviews: { string: "(2,312)" } },
//          commerceInfo: { priceForDisplay: { string: "$302" } },
//          cardPhotos: [ { sizes: { urlTemplate: "...{width}x{height}..." } } ],
//          cardLink: { route: { params: { contentId: 123456 } } },
//        } ... ] } }
//      No address/amenities fields are present in this shape, so (as
//      before) address falls back to null and amenities to [] rather than
//      guessing at field names that were never confirmed.
//
// checkIn/checkOut now DO get sent to the provider (the old "this API
// doesn't accept dates" note was specific to Tripadvisor Scraper and does
// not apply here). Note the date format is YYYY-MM-DD, NOT the MM/DD/YYYY
// the playground's example request happened to show — a real request with
// MM/DD/YYYY came back with a 200 and an explicit validation error body,
// {"errors":{"checkIn":"Incorrect checkIn format, should be YYYY-MM-DD"}},
// so no conversion is needed: our form already collects dates in exactly
// the format this endpoint wants (lib/validators/hotel-search.ts).
// ---------------------------------------------------------------------
const API_HOST = "tripadvisor-com1.p.rapidapi.com";
const API_BASE = `https://${API_HOST}`;

type AutoCompleteItem = {
  geoId?: number | string;
  heading?: { htmlString?: string };
  // Confirmed real shape: the place-type classification is nested here, not
  // at the top level of the item — `trackingItems.placeType` is "ISLAND",
  // "CITY", "HOTEL", etc. A search for "Cebu" returns "Cebu Island"
  // (ISLAND) before "Cebu City" (CITY); the island's geoId has no hotel
  // inventory on /hotels/search, which is why picking the wrong one matters
  // (see pickGeoId below).
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
  // or a specific hotel entity. Confirmed via a real "Cebu" search: the
  // first result is "Cebu Island" (placeType ISLAND) — resolving to *that*
  // geoId is what caused the very first real run to return zero usable
  // offers, because /hotels/search has no hotel inventory attached to the
  // island-level geoId. "Cebu City" (placeType CITY), the very next
  // result, is the one that actually has hotels. Only if nothing is
  // tagged CITY do we fall back to any non-HOTEL place, then finally to
  // whatever the top result was.
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

  // Confirmed live (Day 4, part 3): despite the playground example showing
  // MM/DD/YYYY, the API's own validation error for a real request was
  // explicit — {"errors":{"checkIn":"Incorrect checkIn format, should be
  // YYYY-MM-DD"}} — so no conversion is needed; our form already collects
  // dates in exactly that format (lib/validators/hotel-search.ts).
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
