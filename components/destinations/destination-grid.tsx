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

export function getBentoSpanClassName(
  index: number,
  pattern: string[] = BENTO_SPAN_PATTERN
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
          className={getBentoSpanClassName(index, pattern)}
          priority={index === 0}
        />
      ))}
    </div>
  );
}
