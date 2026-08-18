"use client";

import { motion, useReducedMotion } from "motion/react";
import { Hotel as HotelIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { HotelOffer } from "@/lib/hotels/types";
import { useCurrency } from "@/lib/currency/currency-context";

// A small, shared lift-on-hover treatment — used here and by
// FlightResultCard (components/sections/flight-result-card.tsx), which has
// the identical comment. Kept as a plain object literal rather than a
// third shared file: it's two numbers, not enough shared logic to justify
// a new lib/ import for two call sites. `y: -4` (not a `scale`) is
// deliberate — these cards sit in a tight grid (the flights/hotels results
// grid and the homepage carousel), some as close as `gap-2` apart per your
// own edit there, and a scale transform risks visually overlapping a
// neighboring card mid-hover in a way a pure vertical lift doesn't. The
// existing `hover:shadow-[...]` Tailwind class (below, on the button
// itself) is left as plain CSS rather than animated through Framer Motion
// too — box-shadow isn't a GPU-accelerated property, so animating it via
// Framer risks the exact "janky, non-transform animation" pitfall the
// motion-framer skill warns against; a CSS transition on a property that
// only ever has two states (on/off) doesn't have that cost.
const CARD_HOVER_LIFT = { y: -4 };
const CARD_TAP_LIFT = { y: -1 };
const CARD_LIFT_TRANSITION = { type: "spring" as const, stiffness: 420, damping: 32 };

// Mirrors FlightResultCard's shape and behavior — whole card is clickable,
// opening a modal rather than navigating, per the standing requirement.
export function HotelResultCard({
  offer,
  onSelect,
}: {
  offer: HotelOffer;
  onSelect: (offer: HotelOffer) => void;
}) {
  const { formatPrice } = useCurrency();
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(offer)}
      className="flex h-full w-full flex-col overflow-hidden border border-line bg-paper-raised text-left transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(22,35,43,0.35)]"
      whileHover={prefersReducedMotion ? undefined : CARD_HOVER_LIFT}
      whileTap={prefersReducedMotion ? undefined : CARD_TAP_LIFT}
      transition={CARD_LIFT_TRANSITION}
    >
      <div className="relative h-40 w-full bg-ink/5">
        {offer.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.photo}
            alt={offer.name}
            className="h-full w-full object-cover"
          />
        ) : (
          // A live search occasionally comes back with a real hotel but no
          // photo URL for it (see lib/hotels/tripadvisor-provider.ts) —
          // this used to be plain gray text sitting in the photo slot,
          // which read as a layout bug rather than an honest "we don't
          // have one" state. An icon + label in the same muted treatment
          // used for skeleton loading blocks makes it read as a
          // deliberate empty state instead.
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-soft/70">
            <HotelIcon className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-[11px] uppercase tracking-wide">
              No photo available
            </span>
          </div>
        )}
      </div>
      {/* `w-full` on this wrapper (and again on the price row below) is
          deliberate, not decorative — see FlightResultCard's identical
          comment (components/sections/flight-result-card.tsx) for the full
          Safari flexbox explanation: a flex child that's itself
          `display: flex` doesn't reliably stretch to fill a flex-col parent
          in Safari. `flex-1` alone doesn't cover this — in a column layout
          it only governs this wrapper's *height*, not its width — so
          without an explicit `w-full` this whole wrapper (name, address,
          rating, price row) could shrink to its own content width in
          Safari, narrower than the card, which then drags the price row's
          own `w-full` down to that same too-narrow width instead of the
          card's true full width. Both levels need it: the flight card
          avoids this entirely by having no such intermediate wrapper — its
          rows sit as direct children of the outer flex-col button. */}
      <div className="flex w-full flex-1 flex-col gap-2 p-5">
        <p className="text-[15px] text-ink">{offer.name}</p>
        <p className="text-[12px] text-ink-soft">{offer.address ?? offer.city}</p>
        {offer.rating !== null && (
          <p className="text-[12px] text-ink-soft">
            {offer.rating.toFixed(1)} ★
            {offer.reviewCount !== null && ` · ${offer.reviewCount} reviews`}
          </p>
        )}
        <div className="mt-auto flex w-full items-end justify-between border-t border-line pt-3">
          <span className="text-[12.5px] italic text-ink-soft">Per night</span>
          <span className="text-[18px] text-ink">
            {formatPrice(offer.pricePerNight, offer.currency)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// Loading placeholder matching HotelResultCard's shape (photo block + text
// lines + footer) — same reasoning as FlightResultCardSkeleton: a
// card-shaped pulse reads as "still loading," a flat line of text reads as
// "did this hang?"
export function HotelResultCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden border border-line bg-paper-raised">
      <Skeleton className="h-40 w-full" />
      <div className="flex w-full flex-1 flex-col gap-2 p-5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
        <Skeleton className="h-2.5 w-1/3" />
        <div className="mt-auto flex w-full items-end justify-between border-t border-line pt-3">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}
