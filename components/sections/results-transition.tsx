"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";

// Why this exists: the inline search bar on /flights and /hotels (section
// 21) re-runs a search with `router.push()` *without* leaving the page —
// same route, just new query params. React's App Router deliberately keeps
// the old, already-rendered results on screen during that kind of
// navigation instead of reverting to the nearest <Suspense> fallback (this
// is a real, intentional React behavior: a client-side transition — which
// is what router.push causes — avoids un-rendering content that's already
// successfully shown, precisely so pages don't flicker back to a loading
// state for every small change). That's usually the behavior you want, but
// it means a plain <Suspense> boundary alone — which is what shows the
// skeleton on the very first page load — never fires again on a same-page
// re-search: you'd just see the *old* results sitting there, silently,
// while a new search runs behind them, with no visual sign anything is
// happening.
//
// `useTransition`'s `isPending` flag is the officially-supported way to
// notice that a transition like this is in flight, even though the
// Suspense boundary itself isn't re-showing its fallback. `ResultsPageShell`
// (a small Context provider) makes that flag available to any component
// under it; `useResultsTransition()` reads it. `SearchBar` calls
// `startNavigation()` here instead of calling `router.push()` directly
// whenever it's in "results" mode, and `ResultsPending` (below) uses the
// resulting `isPending` to swap the results area over to a skeleton the
// instant a new search starts, swapping back once the new results are
// actually ready — not before, so there's no flash of an empty grid before
// the real content lands.
const ResultsTransitionContext = createContext<{
  isPending: boolean;
  startNavigation: (navigate: () => void) => void;
} | null>(null);

export function ResultsPageShell({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <ResultsTransitionContext.Provider
      value={{ isPending, startNavigation: (navigate) => startTransition(navigate) }}
    >
      {children}
    </ResultsTransitionContext.Provider>
  );
}

// Returns `null` outside a `ResultsPageShell` (e.g. the homepage's search
// bar, which is in "home" mode and never wrapped in one) — callers should
// treat that as "no transition tracking available here" and fall back to a
// plain `router.push()`.
export function useResultsTransition() {
  return useContext(ResultsTransitionContext);
}

// Wraps the results area. `children` is the actual (often server-rendered)
// results content; `skeleton` is shown in its place — not alongside it —
// for as long as a tracked navigation is pending. Outside a
// `ResultsPageShell` (shouldn't happen given how this is used, but kept
// safe rather than throwing) this just renders `children` as if it weren't
// here at all.
export function ResultsPending({
  skeleton,
  children,
}: {
  skeleton: ReactNode;
  children: ReactNode;
}) {
  const transition = useResultsTransition();
  if (transition?.isPending) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
}
