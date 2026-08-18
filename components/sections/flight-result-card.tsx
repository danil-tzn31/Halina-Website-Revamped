"use client";

import { motion, useReducedMotion } from "motion/react";
import { Plane, PlaneLanding, PlaneTakeoff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlightOffer } from "@/lib/flights/types";
import { formatTime, hasTime } from "@/lib/flights/format";
import { useCurrency } from "@/lib/currency/currency-context";

// A small, shared lift-on-hover treatment — used here and by
// HotelResultCard (components/sections/hotel-result-card.tsx), which has
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

// Card layout, rebuilt around one idea: airline header on top, a route row
// (departure code+time, a connecting line, arrival code+time), and a price
// footer. Same information as before, same positions — what changed is how
// the route row's width math works, after several rounds of a fragile
// "cap the middle group's width by hand, then center it" approach kept
// needing a magic number retuned for every card width. See
// HOW-IT-WORKS.md's polish-pass rounds for that whole story.
//
// The route row now self-balances instead: the departure and arrival blocks
// are sized to their own content (small, now that the airport code — always
// 3 letters — is the headline instead of the variable-width time), and the
// divider between them is the only piece with `flex-1`, so it soaks up
// 100% of whatever space is left. Its dashed line also grows to fill that
// space, so on a wide card the "middle" isn't an empty gap — it's a longer
// version of the same route line, which reads as "this is one connected
// flight path" instead of "two disconnected corners of a card." No width
// needs to be guessed or retuned for this to stay centered and proportional
// at any card size, from the homepage's narrow carousel cards to the full
// results page's wide grid.
//
// `h-full` here (and on the skeleton below) matters for symmetry: these
// cards sit in a CSS grid/flex row alongside other cards whose airline name
// might wrap onto a second line, or whose "Time TBD" fallback (see below)
// takes a different width than a real time. Grid/flex rows stretch every
// cell to the row's tallest item by default, so `h-full` + `flex-col` +
// `mt-auto` on the footer is what makes every card in a row line up at the
// same height and keep its price/footer flush to the bottom regardless of
// how much the header/body content above it varies.
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
      {/* `w-full` on each row below is deliberate, not decorative: without it,
          Safari has a long-standing flexbox quirk where a flex child that is
          itself `display: flex` doesn't reliably inherit the "stretch to
          fill" behavior a flex-col parent normally gives its children —
          Chrome/Chromium follows the spec and stretches it anyway, which is
          exactly why this looked correct in every sandbox check here but
          still showed up bunched to the left, with the rest of the card
          blank, in an actual Safari browser. Stating the width explicitly
          instead of relying on inherited stretch behavior fixes it in both. */}
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

// A departure or arrival airport code + time pair. The airport code is the
// headline: it's always exactly 3 letters, so this block's natural content
// width barely varies flight to flight — that's what lets it just sit at
// its own content size (no `flex-1`) while the divider next to it absorbs
// the rest of the row. Time is a smaller secondary line with a
// takeoff/landing icon showing direction at a glance. When the live API
// hasn't given us a usable time for this leg, this still shows a muted
// "Time TBD" instead of formatTime()'s bare "—" — a lone dash reads like
// something broke; a labelled placeholder reads like an honest "we don't
// have this yet."
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

// The piece between departure and arrival: duration on top, a plane badge,
// stop count below. This used to also draw a dashed line stretching out on
// each side of the badge — but on a wide card, that line was the first
// thing your eye landed on, dominating the whole middle of the card instead
// of reading as a subtle detail. The skeleton loader never had that problem,
// because it never tried to represent the line — it's just three plain
// blocks stacked with generous gaps. Dropping the line entirely and keeping
// this to duration/badge/stops matches that same calmer feel. `flex-1` on
// this whole block (not on the TimePoints anymore) is still what makes it
// the one part of the row that grows to fill whatever space is left —
// nothing here needs to visibly stretch for that to keep working, the
// content just sits centered within however much room it's given.
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

// Loading placeholder shaped exactly like a real card (same borders, same
// three-row layout, same flex-1-on-the-middle-only sizing) so results
// "growing into" their final shape reads as "still searching" rather than
// "the page might have hung" — see HOW-IT-WORKS.md for why the old plain
// "Searching flights…" text was replaced with this everywhere flight
// results load.
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
