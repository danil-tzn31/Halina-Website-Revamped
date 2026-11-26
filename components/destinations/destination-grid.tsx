import type { Destination } from "@/lib/destinations/data";
import { DestinationCard } from "@/components/destinations/destination-card";

// Repeating 6-card span pattern for the asymmetrical ("bento") grid used by
// both the homepage's featured grid and the /destinations page. The mixed
// sizes only kick in at desktop width (lg, 4 columns); tablets get a plain
// 2-column grid, since these shapes can't tile 2 columns without gaps.
//
// grid-auto-flow: dense backfills gaps from out-of-order placement, but
// can't invent extra cards to cover a pattern that's short on total area.
// At 4 columns the six spans (2x2 + 1x1 + 1x2 + 2x1 + 1x1 + 1x1 = 11 cells)
// fall one cell short of a full 12-cell/3-row block, leaving a visible gap
// at the end of every cycle. Index 4 is "wide" instead of "small" to close
// it (11 -> 12 cells).
const BENTO_SPAN_PATTERN = [
  "lg:col-span-2 lg:row-span-2", // big
  "lg:col-span-2",               // wide
  "",                             // small
  "lg:row-span-2",               // tall
  "",                             // small
  "lg:col-span-2",               // wide
];

// A second ordering for the /destinations "see all" page, so its grid
// doesn't repeat the exact same 6-shape cycle as the homepage's.
export const SEE_ALL_BENTO_SPAN_PATTERN = [
  "",                             // small
  "lg:col-span-2",               // wide
  "lg:row-span-2",               // tall
  "lg:col-span-2 lg:row-span-2", // big
  "lg:col-span-2",               // wide
  "",                             // small
];

// What the last few cards use when the list doesn't end on a full set of
// six (the filtered /destinations page, or 38 cards = six sets + 2). Each
// layout fills its final rows exactly at 4 columns, so the grid ends on a
// clean edge instead of a hole, while still mixing card sizes.
const LEFTOVER_SPANS: Record<number, string[]> = {
  1: ["lg:col-span-4 lg:row-span-2"],
  2: ["lg:col-span-3 lg:row-span-2", "lg:row-span-2"],
  3: ["lg:row-span-2", "lg:col-span-2 lg:row-span-2", "lg:row-span-2"], // tall, big, tall
  4: ["lg:col-span-2 lg:row-span-2", "lg:col-span-2", "", ""], // big, wide, small, small
  5: ["lg:row-span-2", "lg:col-span-2", "", "", "lg:col-span-2"], // tall, wide, small, small, wide
};

export function getBentoSpanClassName(
  index: number,
  pattern: string[] = BENTO_SPAN_PATTERN,
  total?: number
): string {
  let span = pattern[index % pattern.length];
  if (total !== undefined) {
    const fullSets = Math.floor(total / pattern.length) * pattern.length;
    const leftover = total - fullSets;
    if (leftover > 0 && index >= fullSets) {
      span = LEFTOVER_SPANS[leftover]?.[index - fullSets] ?? "";
    }
    // On the 2-column tablet grid, an odd count would leave the last card
    // alone next to an empty cell, so it stretches across both columns.
    if (total % 2 === 1 && index === total - 1) {
      span = `${span} sm:max-lg:col-span-2`.trim();
    }
  }
  return span;
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
        "grid grid-cols-1 gap-px sm:grid-cols-2 sm:auto-rows-[220px] sm:[grid-auto-flow:dense] lg:grid-cols-4 lg:auto-rows-[170px]" +
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
