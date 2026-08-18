"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { formatCurrency } from "@/lib/flights/format";
import { convertAmount } from "@/lib/currency/convert";
import {
  FALLBACK_RATES_PER_USD,
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  type CurrencyCode,
} from "@/lib/currency/config";

const STORAGE_KEY = "halina:currency";

interface CurrencyContextValue {
  /** The currency every price on the site is currently displayed in. */
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  /** True once /api/exchange-rates has answered (with either live or
   * fallback rates) — before that, formatPrice() is still safe to call
   * (it uses the fixed fallback table until the real rates arrive), it
   * just might show a number that's about to update slightly. */
  ratesLoaded: boolean;
  /** True when the live rate provider couldn't be reached and the fixed
   * approximate table is being used instead. */
  isFallback: boolean;
  /** Converts + formats amount (given in fromCurrency) into a display
   * string in whichever currency is currently selected — this is what
   * every price in the UI should call instead of formatCurrency directly. */
  formatPrice: (amount: number, fromCurrency: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

// This provider follows the same shape as AuthModalProvider
// (lib/auth-modal-context.tsx): plain React Context + useState, wrapped
// once in components/providers.tsx so any component anywhere in the tree
// can reach it without prop-drilling a currency value through every layer
// between the navbar's picker and, say, a flight card three levels deep in
// a search results grid.
export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Both server and first client render always start from the same fixed
  // default ("PHP") — reading localStorage happens only inside the
  // useEffect below, which never runs during server rendering. That keeps
  // the very first render identical between server and client (avoiding
  // the exact class of hydration mismatch documented in
  // lib/flights/format.ts), at the cost of a saved preference taking
  // effect a moment after the page first paints rather than immediately.
  const [currency, setCurrencyState] = useState<CurrencyCode>("PHP");
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES_PER_USD);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  // Restore a previously-picked currency, once, after mount. This
  // deliberately reads localStorage inside an effect rather than in
  // useState's lazy initializer — an initializer runs during render, and
  // `window` exists during the browser's first render pass but not
  // during server rendering, so reading it there would make the very
  // first client render disagree with the server-rendered HTML (the same
  // class of hydration mismatch documented in lib/flights/format.ts).
  // Doing it in an effect means the first render is always "PHP" on both
  // server and client, and only updates after mount if a saved value
  // exists — a real setState-in-effect, but the safe kind the lint rule's
  // own guidance calls out ("subscribing to an external system," here
  // localStorage), not the kind that could just be computed during render.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isSupportedCurrency(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrencyState(saved);
    }
  }, []);

  // Fetch real exchange rates once per page load. The route itself caches
  // the upstream call for an hour (see app/api/exchange-rates/route.ts), so
  // this is cheap even across many page views.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/exchange-rates")
      .then((res) => res.json())
      .then((data: { rates: Record<CurrencyCode, number>; isFallback: boolean }) => {
        if (cancelled) return;
        setRates(data.rates);
        setIsFallback(data.isFallback);
        setRatesLoaded(true);
      })
      .catch(() => {
        // fetch() itself only rejects on a network-level failure (the
        // route above already turns upstream/API failures into a normal
        // 200 response with isFallback: true) — this catch just keeps the
        // already-set FALLBACK_RATES_PER_USD default in place so prices
        // still render instead of the page breaking.
        if (!cancelled) {
          setIsFallback(true);
          setRatesLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setCurrency(next: CurrencyCode) {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  function formatPrice(amount: number, fromCurrency: string): string {
    const converted = convertAmount(amount, fromCurrency, currency, rates);
    return formatCurrency(converted, currency);
  }

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, ratesLoaded, isFallback, formatPrice }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within <CurrencyProvider>");
  }
  return ctx;
}

export { SUPPORTED_CURRENCIES };
