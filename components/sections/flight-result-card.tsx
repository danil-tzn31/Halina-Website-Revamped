"use client";

import { motion, useReducedMotion } from "motion/react";
import { Plane, PlaneLanding, PlaneTakeoff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlightOffer } from "@/lib/flights/types";
import { formatTime, hasTime } from "@/lib/flights/format";
import { useCurrency } from "@/lib/currency/currency-context";

// Shared lift-on-hover treatment, mirrored in HotelResultCard. `y: -4`
// rather than `scale` — cards sit in a tight grid (gap-2 in places), and a
// scale transform risks overlapping the neighboring card mid-hover. The
// shadow stays plain CSS instead of animating through Framer since
// box-shadow isn't GPU-accelerated.
const CARD_HOVER_LIFT = { y: -4 };
const CARD_TAP_LIFT = { y: -1 };
const CARD_LIFT_TRANSITION = { type: "spring" as const, stiffness: 420, damping: 32 };

// Airline header, route row (departure code+time / divider / arrival
// code+time), price footer. The divider is the only element in the route
// row with `flex-1`, so it absorbs whatever space is left instead of
// needing a hand-tuned width per card size.
//
// `h-full` + `flex-col` + `mt-auto` on the footer keeps every card in a
// grid row the same height and the price flush to the bottom, regardless
// of how much header/body content varies (wrapped airline names, etc).
export function FlightResultCard({
  offer,
  onSelect,
}: {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
}) {
  const firstLeg = offer.segments[0];
  const lastLeg = offer.segments[offer.segments.length - 1];
  const { formatPrice } = useCurrency();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(offer)}
      className="flex h-full w-full flex-col border border-line bg-paper-raised text-left transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(22,35,43,0.35)]"
      whileHover={prefersReducedMotion ? undefined : CARD_HOVER_LIFT}
      whileTap={prefersReducedMotion ? undefined : CARD_TAP_LIFT}
      transition={CARD_LIFT_TRANSITION}
    >
      {/* `w-full` on each row is required for Safari: a flex child that is
          itself `display: flex` doesn't reliably inherit the flex-col
          parent's "stretch to fill" behavior there, so rows end up bunched
          left. Chrome stretches it fine either way, but this needs to be
          explicit for both. */}
      <div className="flex w-full items-center gap-2.5 p-4 pb-3">
        <AirlineMark logo={firstLeg?.airlineLogo ?? null} name={firstLeg?.airline ?? ""} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] text-ink">{firstLeg?.airline}</p>
          <p className="text-[12.5px] text-ink-soft">{firstLeg?.flightNumber}</p>
        </div>
      </div>

      <div className="flex w-full items-center gap-3 px-4 pb-4">
        <TimePoint time={firstLeg?.departureTime} code={firstLeg?.departureAirportCode} align="left" />
        <RouteDivider durationText={offer.durationText} stops={offer.stops} />
        <TimePoint time={lastLeg?.arrivalTime} code={lastLeg?.arrivalAirportCode} align="right" />
      </div>

      <div className="mt-auto flex w-full items-center justify-between gap-4 px-4 py-3">
        <span className="text-[12.5px] italic text-ink-soft">Tap for details</span>
        <span className="text-[21px] text-ink">
          {formatPrice(offer.price, offer.currency)}
        </span>
      </div>
    </motion.button>
  );
}

// Airport code + time pair. Code is always 3 letters, so this block sizes
// to its own content (no `flex-1`) while the divider absorbs the rest of
// the row. Falls back to "Time TBD" instead of formatTime()'s bare "—"
// when the API doesn't return a usable time — a dash reads as broken, a
// label reads as intentional.
function TimePoint({
  time,
  code,
  align,
}: {
  time?: string;
  code?: string;
  align: "left" | "right";
}) {
  const known = hasTime(time);
  const Icon = align === "left" ? PlaneTakeoff : PlaneLanding;
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-1.5",
        align === "right" ? "items-end text-right" : "items-start text-left"
      )}
    >
      <p className="whitespace-nowrap text-[20px] text-ink">{code}</p>
      <p
        className={cn(
          "flex items-center gap-1 whitespace-nowrap text-[12px]",
          known ? "text-ink-soft" : "italic text-ink-soft/70",
          align === "right" && "flex-row-reverse"
        )}
      >
        <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={1.75} />
        {known ? formatTime(time ?? "") : "Time TBD"}
      </p>
    </div>
  );
}

// Duration, plane badge, and stop count between departure and arrival.
// `flex-1` on this block is what lets it absorb the leftover row width
// instead of the TimePoints.
function RouteDivider({ durationText, stops }: { durationText: string; stops: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="whitespace-nowrap text-[11px] uppercase tracking-wide text-ink-soft">
        {durationText}
      </span>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-paper">
        <Plane className="h-2.5 w-2.5 rotate-90 text-ink-soft" strokeWidth={1.75} />
      </span>
      <span className="whitespace-nowrap text-[11px] uppercase tracking-wide text-ink-soft">
        {stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}
      </span>
    </div>
  );
}

function AirlineMark({ logo, name }: { logo: string | null; name: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={name} className="h-6 w-6 shrink-0 rounded-full object-contain" />;
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[11px] text-ink-soft">
      {name.slice(0, 1) || "?"}
    </span>
  );
}

// Loading placeholder matching the real card's layout, so results "growing
// into" their final shape reads as still-searching rather than stalled.
export function FlightResultCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col border border-line bg-paper-raised">
      <div className="flex w-full items-center gap-2.5 p-4 pb-3">
        <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
      <div className="flex w-full items-center gap-3 px-4 pb-4">
        <div className="flex shrink-0 flex-col gap-1.5">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
          <Skeleton className="h-2.5 w-14" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      <div className="mt-auto flex w-full items-center justify-between gap-4 px-4 py-3">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
