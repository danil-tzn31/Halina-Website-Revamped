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

// `"default"` returns offers in whatever order the provider returned
// them — there's no "recommended" scoring of our own, so this is the
// honest label for "no sort applied."
export function sortFlightOffers(offers: FlightOffer[], sortKey: FlightSortKey): FlightOffer[] {
  if (sortKey === "default") return offers;
  const sorted = [...offers];
  sorted.sort((a, b) => (sortKey === "price_asc" ? a.price - b.price : b.price - a.price));
  return sorted;
}
