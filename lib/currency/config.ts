// The five currencies this site's currency picker supports — carried over
// from the original PHP capstone project, which had the same list (its
// target audience is planning travel to/from the Philippines, so PHP/USD
// cover most of that, and EUR/KRW/JPY cover the next-most-common visitor
// origins). Every price on the site is stored and calculated in whatever
// currency the flight/hotel offer actually came in (see FlightOffer.currency
// / HotelOffer.currency) — this list is only ever used for *display*:
// converting that real amount into whichever of these five the visitor has
// picked, at the moment it's shown on screen.
export const SUPPORTED_CURRENCIES = ["PHP", "USD", "EUR", "KRW", "JPY"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  PHP: "Philippine Peso",
  USD: "US Dollar",
  EUR: "Euro",
  KRW: "South Korean Won",
  JPY: "Japanese Yen",
};

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

// Approximate units of each currency per 1 USD. This is ONLY a safety net —
// used by /api/exchange-rates when the live rate provider can't be reached,
// same idea as the seeded fallback data in lib/flights/mock-data.ts and
// lib/hotels/mock-data.ts. Rates drift over time in real life, but this
// exists purely so currency conversion still works (with a visible "these
// are approximate" notice) rather than the page breaking, not to be
// financially accurate. Sourced from rough real-world figures at the time
// this was written (2026) — close enough for a portfolio demo, not close
// enough to use for an actual purchase.
export const FALLBACK_RATES_PER_USD: Record<CurrencyCode, number> = {
  USD: 1,
  PHP: 58,
  EUR: 0.92,
  KRW: 1380,
  JPY: 152,
};
