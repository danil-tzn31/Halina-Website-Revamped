"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

// Renders nothing when there's only one page, so this can be dropped into
// a results grid unconditionally without callers checking totalPages
// themselves.
//
// Used both above and below the results grid so a long list has a way back
// to the top without scrolling by hand. `className` lets each call site
// adjust its own spacing.
export function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
  className,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const arrowClasses = (disabled: boolean) =>
    cn(
      "flex h-9 w-9 items-center justify-center border border-line text-ink transition-colors",
      disabled ? "cursor-not-allowed text-ink-soft/40" : "hover:bg-ink/5"
    );

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 0}
        aria-label="Previous page"
        className={arrowClasses(page === 0)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-[13px] text-ink-soft">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        aria-label="Next page"
        className={arrowClasses(page >= totalPages - 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
