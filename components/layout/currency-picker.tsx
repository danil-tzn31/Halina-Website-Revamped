"use client";

import { ChevronDown } from "lucide-react";

import { useCurrency, SUPPORTED_CURRENCIES } from "@/lib/currency/currency-context";
import { cn } from "@/lib/utils";

// Still a plain native <select> under the hood — for a short, fixed list
// like five currency codes, a native control is genuinely the right
// choice: full keyboard support, screen reader behavior, and a
// mobile-friendly picker UI, all for free. What changed is the *chrome*
// around it: the browser's own dropdown arrow (`appearance-none` hides it)
// is replaced with the same lucide ChevronDown used elsewhere on the site
// (the search bar's number-field steppers), so this reads as a piece of
// Halina's own design rather than a bare, unstyled form control dropped
// into the nav.
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
          // Same reasoning as navbar.tsx's `showLight` elements: a shadow
          // plus higher base opacity, not opacity alone, since the hero
          // photo's brightness right behind the nav isn't guaranteed to be
          // dark enough for plain translucent white text to stay legible.
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
