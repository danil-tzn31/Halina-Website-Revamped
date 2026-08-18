// Same idea as lib/flights/types.ts: one normalized shape every component
// works with, independent of which provider produced it. Once the exact
// TripAdvisor Scraper response shape is confirmed (see the note at the top
// of tripadvisor-provider.ts), only that one file needs to change — nothing
// here or in the UI does.
export type HotelOffer = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  pricePerNight: number;
  currency: string;
  photo: string | null;
  amenities: string[];
};

export type HotelSearchParams = {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export type HotelSearchResult = {
  offers: HotelOffer[];
  /** True when the real API couldn't be reached/parsed and this is the
   * seeded fallback dataset — same convention as flights, see
   * lib/flights/types.ts. */
  isFallback: boolean;
};
