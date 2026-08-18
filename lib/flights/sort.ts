import type { FlightOffer } from "@/lib/flights/types";

// Shared between components/sections/flight-results-grid.tsx (one-way
// results) and round-trip-flight-picker.tsx (both steps of a round trip) so
// both sort identically instead of each hand-rolling its own comparator.
export type FlightSortKey = "default" | "price_asc" | "price_desc";

export const FLIGHT_SORT_OPTIONS: { value: FlightSortKey; label: string }[] = [
  { value: "default", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

// `"default"` returns the offers in whatever order the provider (or its
// seeded fallback data) returned them in — this app has no "recommended"
// scoring of its own, so "no sort applied yet" is the honest label for that
// state rather than pretending there's a smarter ranking underneath.
export function sortFlightOffers(offers: FlightOffer[], sortKey: FlightSortKey): FlightOffer[] {
  if (sortKey === "default") return offers;
  const sorted = [...offers];
  sorted.sort((a, b) => (sortKey === "price_asc" ? a.price - b.price : b.price - a.price));
  return sorted;
}
