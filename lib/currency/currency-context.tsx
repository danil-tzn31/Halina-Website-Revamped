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

// Same shape as AuthModalProvider (lib/auth-modal-context.tsx): plain React
// Context + useState, wrapped once in components/providers.tsx so any
// component can reach it without prop-drilling.
export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Server and first client render both start from the fixed default
  // ("PHP") — localStorage is only read inside the effect below, which
  // never runs during server rendering. Keeps the first render identical
  // between server and client, at the cost of a saved preference applying
  // a moment after first paint rather than immediately.
  const [currency, setCurrencyState] = useState<CurrencyCode>("PHP");
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES_PER_USD);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  // Restore a previously-picked currency, once, after mount. Reads
  // localStorage in an effect rather than useState's lazy initializer,
  // since an initializer runs during render and `window` isn't available
  // during server rendering — reading it there would disagree with the
  // server-rendered HTML. This is the safe kind of setState-in-effect
  // (subscribing to an external system), not one that could just be
  // computed during render.
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
        // fetch() only rejects on a network-level failure (the route
        // already turns upstream failures into a 200 with isFallback:
        // true) — keep the FALLBACK_RATES_PER_USD default so prices still
        // render.
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
