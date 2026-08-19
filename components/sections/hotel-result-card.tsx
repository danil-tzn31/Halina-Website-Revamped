"use client";

import { motion, useReducedMotion } from "motion/react";
import { Hotel as HotelIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { HotelOffer } from "@/lib/hotels/types";
import { useCurrency } from "@/lib/currency/currency-context";

// Shared lift-on-hover treatment, mirrored in FlightResultCard. `y: -4`
// rather than `scale` to avoid overlapping neighboring cards in the tight
// results grid.
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
          // Live search occasionally returns a hotel with no photo URL —
          // an icon + label reads as an intentional empty state rather
          // than a layout bug.
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-soft/70">
            <HotelIcon className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-[11px] uppercase tracking-wide">
              No photo available
            </span>
          </div>
        )}
      </div>
      {/* `w-full` here and on the price row below works around the same
          Safari flexbox quirk as FlightResultCard — `flex-1` alone only
          governs height in a column layout, not width. */}
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

// Loading placeholder matching HotelResultCard's shape.
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
