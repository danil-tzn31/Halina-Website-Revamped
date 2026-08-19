// The five currencies the picker supports — carried over from the original
// PHP site (PHP/USD cover travel to/from the Philippines, EUR/KRW/JPY cover
// the next-most-common visitor origins). Every price is stored and
// calculated in whatever currency the offer actually came in; this list is
// only used for *display*, converting that amount at render time.
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

// Approximate units of each currency per 1 USD — a fallback used by
// /api/exchange-rates when the live rate provider can't be reached, so
// conversion still works (with a visible "approximate" notice) instead of
// the page breaking. Not kept precisely up to date; not for real purchases.
export const FALLBACK_RATES_PER_USD: Record<CurrencyCode, number> = {
  USD: 1,
  PHP: 58,
  EUR: 0.92,
  KRW: 1380,
  JPY: 152,
};
