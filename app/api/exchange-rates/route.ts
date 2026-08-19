import { NextResponse } from "next/server";

import {
  FALLBACK_RATES_PER_USD,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "@/lib/currency/config";

// Small server-side proxy, same reasoning as flights/search and
// hotels/search: the browser never calls the third-party API directly.
//
// open.er-api.com needs no API key and its free tier covers all five
// supported currencies, including PHP and KRW — many free forex APIs only
// cover major currencies.
const RATES_API_URL = "https://open.er-api.com/v6/latest/USD";

type RatesResponse = {
  rates: Record<CurrencyCode, number>;
  /** True when the live provider couldn't be reached/parsed and the fixed
   * approximate table is being used instead — the currency picker shows a
   * subtle notice in this case, same pattern as flight/hotel search
   * falling back to seeded sample data. */
  isFallback: boolean;
};

async function fetchLiveRates(): Promise<Record<CurrencyCode, number>> {
  // AbortSignal.timeout() is a plain built-in here — no need for the
  // manual AbortController + setTimeout dance, and it guarantees this
  // route always responds quickly even if the upstream API hangs, instead
  // of leaving a page waiting on it indefinitely.
  const res = await fetch(RATES_API_URL, {
    signal: AbortSignal.timeout(5000),
    // Exchange rates don't need to be second-by-second fresh for a travel
    // site's display purposes — caching this for an hour means most page
    // loads never actually hit the external API at all.
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`open.er-api.com responded ${res.status}`);
  }

  const data = await res.json();
  if (data?.result !== "success" || typeof data?.rates !== "object") {
    throw new Error("open.er-api.com returned an unexpected shape");
  }

  const rates = {} as Record<CurrencyCode, number>;
  for (const code of SUPPORTED_CURRENCIES) {
    const rate = data.rates[code];
    if (typeof rate !== "number" || !Number.isFinite(rate)) {
      throw new Error(`open.er-api.com response is missing a rate for ${code}`);
    }
    rates[code] = rate;
  }
  return rates;
}

export async function GET() {
  try {
    const rates = await fetchLiveRates();
    return NextResponse.json({ rates, isFallback: false } satisfies RatesResponse);
  } catch (error) {
    console.error("[currency] falling back to fixed exchange rates:", error);
    return NextResponse.json({
      rates: FALLBACK_RATES_PER_USD,
      isFallback: true,
    } satisfies RatesResponse);
  }
}
