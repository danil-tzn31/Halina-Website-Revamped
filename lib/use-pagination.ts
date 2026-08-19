"use client";

import { useEffect, useState } from "react";

// Slices a results array into fixed-size pages instead of rendering all
// 20-30+ offers in one long scroll. Shared by HotelResultsGrid,
// FlightResultsGrid, and RoundTripFlightPicker's ResultsList so all three
// paginate the same way.
export const RESULTS_PAGE_SIZE = 20;

export function usePagination<T>(items: T[], pageSize: number = RESULTS_PAGE_SIZE) {
  const [page, setPage] = useState(0);

  // Jump back to page 1 whenever the underlying item list changes (new
  // search or a different sort order) so a shrunk list can't leave `page`
  // pointing past the end.
  //
  // Deliberate exception to the project's `react-hooks/set-state-in-effect`
  // lint rule: "which page you're on" is genuine independent state — it
  // can't be derived from `items` alone since it also changes from
  // goToNext/goToPrev clicks unrelated to `items`. A plain effect reacting
  // to an external change by resetting separate state is the right tool
  // here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0);
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // `page` can briefly point past the end for one render right after
  // `items` shrinks, since the effect above updates asynchronously — clamp
  // rather than trust `page` directly.
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  // Scroll to top on every page change so clicking "next" from the bottom
  // of a long results page doesn't leave the new cards rendering above the
  // visible area.
  //
  // Uses `behavior: "instant"`, not `"smooth"`: `setPage` runs first, so a
  // smooth scroll would animate based on the current page's height, then
  // get cut short when the shorter new page renders and the document
  // shrinks underneath it mid-animation. An instant jump completes before
  // that layout shift happens.
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return {
    pageItems,
    page: safePage,
    totalPages,
    goToPrev: () => {
      setPage((current) => Math.max(0, current - 1));
      scrollToTop();
    },
    goToNext: () => {
      setPage((current) => Math.min(totalPages - 1, current + 1));
      scrollToTop();
    },
  };
}
