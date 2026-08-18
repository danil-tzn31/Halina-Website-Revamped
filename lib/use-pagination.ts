"use client";

import { useEffect, useState } from "react";

// A search can come back with 20-30+ offers, and rendering every single one
// in one long grid made the results pages an unusually long scroll with no
// way to jump back to the top (where the sort control and search bar live)
// without scrolling all the way up by hand. This hook slices a results
// array into fixed-size pages instead — used by HotelResultsGrid,
// FlightResultsGrid, and RoundTripFlightPicker's ResultsList, so all three
// result grids in the app paginate the same way rather than each rolling
// their own slicing logic.
export const RESULTS_PAGE_SIZE = 20;

export function usePagination<T>(items: T[], pageSize: number = RESULTS_PAGE_SIZE) {
  const [page, setPage] = useState(0);

  // Jump back to page 1 whenever the underlying item list changes — a new
  // search, or a different sort order (sorting produces a new array from
  // useMemo even though it's the same offers). Without this, sorting while
  // sitting on page 2 of a shrunk list could leave `page` pointing past the
  // new end, and re-sorting would otherwise leave you stranded on whatever
  // page number you happened to be on rather than showing the new top
  // result first.
  //
  // This is a genuine, justified exception to this project's stricter
  // `react-hooks/set-state-in-effect` rule (see HOW-IT-WORKS.md's Day 3
  // section for the general rule, and section 19 of the revamp plan for
  // the one other place this codebase makes the same kind of exception,
  // with the same reasoning): the usual fix is to *derive* state instead
  // of storing-then-syncing it, but "which page you're on" genuinely is
  // its own independent state — it can't be derived from `items` alone,
  // since it also changes from `goToNext`/`goToPrev` clicks that have
  // nothing to do with `items` changing at all. React's own documented
  // alternative (comparing the previous value against a ref during render)
  // doesn't help here either — this project's compiler-aware lint config
  // separately forbids reading or writing a ref during render, precisely
  // because the point of that trick is to sit outside the normal
  // render/effect split it depends on. A plain effect is the correct tool
  // for exactly this: reacting to an external change (`items`) by
  // resetting a genuinely separate piece of state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0);
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // `page` state can briefly point past the end for one render right after
  // `items` shrinks (state updates from the effect above are asynchronous)
  // — clamping here rather than trusting `page` directly keeps that one
  // render from slicing out of range.
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  // Changing pages swaps in a whole new set of cards further down the
  // page, but leaves the browser's scroll position exactly where it was —
  // on a long results page, clicking "next" while scrolled down to the
  // bottom (right where the controls are) would leave the new page's cards
  // rendering entirely above the visible area, invisible until scrolled up
  // by hand. Scrolling back to the very top on every page change (both
  // directions, not just "next") means you always land where the search
  // bar and sort control are, seeing the new page's first result
  // immediately — the same reasoning `pt-[104px]` elsewhere in this app
  // uses for "where a page visually starts" once the navbar went `fixed`.
  //
  // This uses `behavior: "instant"`, not `"smooth"` — confirmed the hard
  // way, not guessed. `setPage` above is called first, synchronously, so
  // this scroll starts an animation based on the *current* (about-to-be-
  // replaced) page's height; the instant the new, usually much shorter,
  // page of cards actually renders a moment later, the document shrinks
  // underneath that in-progress animation. Chrome treats that shrink as
  // outside interference and simply cancels the smooth scroll wherever it
  // happened to be — verified via a Playwright script logging `scrollY`
  // every 300ms after a real click, which showed it stopping partway and
  // never reaching 0. An instant jump completes in the same tick it's
  // called, before that layout shift can ever happen, so there's no
  // window for the animation to get interrupted in.
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
