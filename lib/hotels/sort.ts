import type { HotelOffer } from "@/lib/hotels/types";

export type HotelSortKey = "default" | "price_asc" | "price_desc" | "rating_desc" | "rating_asc";

export const HOTEL_SORT_OPTIONS: { value: HotelSortKey; label: string }[] = [
  { value: "default", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating_desc", label: "Rating: High to Low" },
  { value: "rating_asc", label: "Rating: Low to High" },
];

// `rating` can be `null` on a HotelOffer (see lib/hotels/types.ts — not
// every provider response carries a rating). Whichever rating sort is
// picked, hotels with no rating at all sink to the bottom rather than
// being treated as "rating 0" — an unrated hotel isn't a badly-rated one,
// it's just missing that data, so it shouldn't outrank real 1-star results
// under "High to Low" or get buried above real 5-star results under "Low
// to High."
export function sortHotelOffers(offers: HotelOffer[], sortKey: HotelSortKey): HotelOffer[] {
  if (sortKey === "default") return offers;
  const sorted = [...offers];
  sorted.sort((a, b) => {
    if (sortKey === "price_asc") return a.pricePerNight - b.pricePerNight;
    if (sortKey === "price_desc") return b.pricePerNight - a.pricePerNight;
    if (a.rating === null && b.rating === null) return 0;
    if (a.rating === null) return 1;
    if (b.rating === null) return -1;
    return sortKey === "rating_desc" ? b.rating - a.rating : a.rating - b.rating;
  });
  return sorted;
}
