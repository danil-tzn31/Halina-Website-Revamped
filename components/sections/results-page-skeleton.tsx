import type { ComponentType } from "react";

import { Skeleton } from "@/components/ui/skeleton";

// Shown by <Suspense> while /flights or /hotels's live data fetch is in
// flight. Also what you see on every same-page re-search via the inline
// search bar, not just first load, so it's worth this shared component
// rather than a plain "Loading…" line.
//
// Generic over which card skeleton to render so both results pages share
// one layout (title, subtitle, sort slot, card grid) instead of near-duplicate
// copies.
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
