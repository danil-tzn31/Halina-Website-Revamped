"use client";

import { ChevronDown } from "lucide-react";

import { useCurrency, SUPPORTED_CURRENCIES } from "@/lib/currency/currency-context";
import { cn } from "@/lib/utils";

// Native <select> for full keyboard/screen-reader support and a
// mobile-friendly picker, for free. `appearance-none` hides the browser's
// own arrow, replaced with the same lucide ChevronDown used elsewhere on
// the site so it reads as part of Halina's own design.
export function CurrencyPicker({ isOverlay }: { isOverlay: boolean }) {
  const { currency, setCurrency, isFallback } = useCurrency();

  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label="Display currency"
        title={
          isFallback
            ? "Showing approximate exchange rates — the live rate service didn't respond"
            : "Change display currency"
        }
        value={currency}
        onChange={(e) => setCurrency(e.target.value as (typeof SUPPORTED_CURRENCIES)[number])}
        className={cn(
          "cursor-pointer appearance-none border-0 bg-transparent py-1 pl-0 pr-4 text-[13px] tracking-wide focus:outline-none",
          // Shadow + opacity, same as navbar.tsx's `showLight` elements —
          // keeps text legible over a hero photo of unpredictable brightness.
          isOverlay
            ? "text-paper/90 [text-shadow:0_1px_4px_rgb(0_0_0/45%)] hover:text-paper"
            : "text-ink-soft hover:text-ink"
        )}
      >
        {SUPPORTED_CURRENCIES.map((code) => (
          <option key={code} value={code} className="text-ink">
            {code}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 h-3 w-3",
          isOverlay
            ? "text-paper/90 [text-shadow:0_1px_4px_rgb(0_0_0/45%)]"
            : "text-ink-soft"
        )}
      />
    </div>
  );
}
