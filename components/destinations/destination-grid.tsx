import type { Destination } from "@/lib/destinations/data";
import { DestinationCard } from "@/components/destinations/destination-card";

// The asymmetrical ("bento") layout both the homepage's featured grid and
// the /destinations "see all" page use. A plain uniform grid (every card
// the same size) is what this replaced — this repeats a 6-card pattern of
// varied sizes for visual rhythm, rather than hand-placing every single
// destination's card size one at a time, which wouldn't scale to the
// "see all" page's 38 cards.
//
// grid-auto-flow: dense (via [grid-auto-flow:dense]) backfills gaps left by
// *out-of-order* placement (e.g. a small card slotting in next to a tall
// one before a later item needs that row) — but it can't invent extra
// cards to fill space a pattern's total area falls short of. At 4 columns,
// this pattern's six spans (2x2 + 1x1 + 1x2 + 2x1 + 1x1 + 1x1 = 11 cells)
// used to fall one cell short of the 12-cell (3-row) block dense-fill
// naturally settles into, leaving a real, visible empty cell at the end of
// every 6-card cycle — not something `dense` could paper over on its own.
// Fixed by making index 4 "wide" instead of "small" (11 -> 12 cells),
// which the browser now tiles into two half-width cards side by side along
// the bottom of each cycle, with zero leftover cells.
// You asked, separately, for no two same-*shape* cards (e.g. two "wide"
// cards, or two "small" cards) to sit next to each other on screen, if
// possible. It turns out not to be fully possible with this exact set of
// four shapes (1 big, 2 wide, 1 tall, 2 small) — checked by simulating the
// browser's actual placement algorithm for all 180 distinct orderings of
// this shape set, plus every pair of two different orderings alternating
// with each other, looking for one with zero same-shape neighbors across
// several repeats. None exist. The best any ordering can do is a single
// 6-card cycle with zero same-shape neighbors *inside* it — but the seam
// where one cycle's last row meets the next cycle's first row always
// reintroduces exactly one same-shape pair, no matter which ordering or
// which two orderings you alternate between. That's a hard floor for this
// shape recipe, not a bug worth continuing to chase.
//
// The same simulation found exactly 8 orderings (out of 180) that hit that
// floor. The order below (big, wide, small, tall, small, wide) is one of
// them, and it's what the homepage's 6-card featured grid uses. But the
// /destinations "see all" page rendered the exact same 6-shape cycle
// starting from the exact same point — so its grid *looked* identical to
// the homepage's for the first row, even though it's showing 38 different
// destinations. Of the other 7 optimal orderings, most turned out to just
// be this same cycle starting at a different point (a "rotation" — e.g.
// starting the read at "wide" instead of "big" is still fundamentally the
// same repeating sequence). SEE_ALL_BENTO_SPAN_PATTERN below (small, wide,
// tall, big, wide, small) is one of the ones that ISN'T a rotation of this
// one — a genuinely different visual rhythm — while still hitting the same
// mathematical floor of same-shape touches. See getBentoSpanClassName and
// the `pattern` prop below for how a page picks which one it uses.
const BENTO_SPAN_PATTERN = [
  "sm:col-span-2 sm:row-span-2", // big
  "sm:col-span-2",               // wide
  "",                             // small
  "sm:row-span-2",               // tall
  "",                             // small
  "sm:col-span-2",               // wide
];

// Used only by the /destinations "see all" page (app/destinations/page.tsx),
// via the `pattern` prop on DestinationGrid below — see the comment above
// BENTO_SPAN_PATTERN for why this exists and how it was chosen.
export const SEE_ALL_BENTO_SPAN_PATTERN = [
  "",                             // small
  "sm:col-span-2",               // wide
  "sm:row-span-2",               // tall
  "sm:col-span-2 sm:row-span-2", // big
  "sm:col-span-2",               // wide
  "",                             // small
];

export function getBentoSpanClassName(
  index: number,
  pattern: string[] = BENTO_SPAN_PATTERN,
): string {
  return pattern[index % pattern.length];
}

export function DestinationGrid({
  destinations,
  className,
  pattern = BENTO_SPAN_PATTERN,
}: {
  destinations: Destination[];
  className?: string;
  // Which repeating 6-shape cycle to use for card sizing. Defaults to the
  // homepage's pattern; pass SEE_ALL_BENTO_SPAN_PATTERN (or your own, as
  // long as it's one of the 8 optimal orderings — see the comment above) to
  // give a page a visually distinct grid.
  pattern?: string[];
}) {
  return (
    <div
      className={
        // gap-1, not the old gap-4: you asked for the cards to look more
        // tightly "compressed" together, with less cream page-background
        // showing as a border between them.
        "grid grid-cols-1 gap-px sm:grid-cols-2 sm:auto-rows-[170px] sm:[grid-auto-flow:dense] lg:grid-cols-4" +
        (className ? ` ${className}` : "")
      }
    >
      {destinations.map((destination, index) => (
        <DestinationCard
          key={destination.slug}
          destination={destination}
          className={getBentoSpanClassName(index, pattern)}
          priority={index === 0}
        />
      ))}
    </div>
  );
}
