import type { Destination } from "@/lib/destinations/data";
import { DestinationCard } from "@/components/destinations/destination-card";

// Repeating 6-card span pattern for the asymmetrical ("bento") grid used by
// both the homepage's featured grid and the /destinations page.
//
// grid-auto-flow: dense backfills gaps from out-of-order placement, but
// can't invent extra cards to cover a pattern that's short on total area.
// At 4 columns the six spans (2x2 + 1x1 + 1x2 + 2x1 + 1x1 + 1x1 = 11 cells)
// fall one cell short of a full 12-cell/3-row block, leaving a visible gap
// at the end of every cycle. Index 4 is "wide" instead of "small" to close
// it (11 -> 12 cells).
const BENTO_SPAN_PATTERN = [
  "sm:col-span-2 sm:row-span-2", // big
  "sm:col-span-2",               // wide
  "",                             // small
  "sm:row-span-2",               // tall
  "",                             // small
  "sm:col-span-2",               // wide
];

// A second ordering for the /destinations "see all" page, so its grid
// doesn't repeat the exact same 6-shape cycle as the homepage's.
export const SEE_ALL_BENTO_SPAN_PATTERN = [
  "",                             // small
  "sm:col-span-2",               // wide
  "sm:row-span-2",               // tall
  "sm:col-span-2 sm:row-span-2", // big
  "sm:col-span-2",               // wide
  "",                             // small
];

// What the last few cards use when the list doesn't end on a full set of
// six (the filtered /destinations page, or 38 cards = six sets + 2). Each
// layout fills its final rows exactly at 4 columns, so the grid ends on a
// clean edge instead of a hole, while still mixing card sizes.
const LEFTOVER_SPANS: Record<number, string[]> = {
  1: ["sm:col-span-2 sm:row-span-2 lg:col-span-4"],
  2: ["sm:col-span-2 sm:row-span-2 lg:col-span-3", "sm:col-span-2 sm:row-span-2 lg:col-span-1"],
  3: ["sm:row-span-2", "sm:col-span-2 sm:row-span-2", "sm:row-span-2"], // tall, big, tall
  4: ["sm:col-span-2 sm:row-span-2", "sm:col-span-2", "", ""], // big, wide, small, small
  5: ["sm:row-span-2", "sm:col-span-2", "", "", "sm:col-span-2"], // tall, wide, small, small, wide
};

export function getBentoSpanClassName(
  index: number,
  pattern: string[] = BENTO_SPAN_PATTERN,
  total?: number
): string {
  if (total !== undefined) {
    const fullSets = Math.floor(total / pattern.length) * pattern.length;
    const leftover = total - fullSets;
    if (leftover > 0 && index >= fullSets) {
      return LEFTOVER_SPANS[leftover]?.[index - fullSets] ?? "";
    }
  }
  return pattern[index % pattern.length];
}

export function DestinationGrid({
  destinations,
  className,
  pattern = BENTO_SPAN_PATTERN,
}: {
  destinations: Destination[];
  className?: string;
  pattern?: string[];
}) {
  return (
    <div
      className={
        // gap-px keeps cards nearly flush, minimal background showing between them.
        "grid grid-cols-1 gap-px sm:grid-cols-2 sm:auto-rows-[170px] sm:[grid-auto-flow:dense] lg:grid-cols-4" +
        (className ? ` ${className}` : "")
      }
    >
      {destinations.map((destination, index) => (
        <DestinationCard
          key={destination.slug}
          destination={destination}
          className={getBentoSpanClassName(index, pattern, destinations.length)}
          priority={index === 0}
        />
      ))}
    </div>
  );
}
