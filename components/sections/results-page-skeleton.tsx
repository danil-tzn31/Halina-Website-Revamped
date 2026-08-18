import type { ComponentType } from "react";

import { Skeleton } from "@/components/ui/skeleton";

// Shown by React's <Suspense> while /flights or /hotels's actual data
// fetch (the live provider call) is still in flight, so the page never
// just sits there looking frozen while it waits — the same reasoning
// behind every other loading state in this app (see HOW-IT-WORKS.md,
// "Polish pass: symmetrical flight cards, real loading states..."): a
// shape that already resembles the eventual layout reads as "still
// working," where a blank gap or a plain "Loading…" line reads as "did
// this hang?" This matters more here than it did on the homepage carousel,
// because the results pages' inline search bar (section 21) now lets you
// re-run a search without leaving the page — every one of those re-searches
// re-triggers this same live fetch, so this is the loading state you'll
// actually see most often, not just on first page load.
//
// Generic over which card skeleton to render (`FlightResultCardSkeleton` or
// `HotelResultCardSkeleton`) so both results pages share this one layout —
// title line, subtitle line, the sort control's slot, and a grid of
// card-shaped placeholders — instead of each defining an almost-identical
// copy, the same DRY reasoning already applied to the sort utilities and
// the search bar's `mode` prop (section 21).
export function ResultsPageSkeleton({
  CardSkeleton,
  count = 6,
}: {
  CardSkeleton: ComponentType;
  count?: number;
}) {
  return (
    <div>
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-8">
        <div className="mb-5 flex justify-end">
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
