"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";

// The inline search bar on /flights and /hotels re-runs a search with
// `router.push()` without leaving the page. App Router keeps the old
// results on screen during that client-side transition instead of
// reverting to the <Suspense> fallback, so a same-page re-search shows
// stale results with no indication a new search is running.
//
// `useTransition`'s `isPending` flag catches that case. `ResultsPageShell`
// exposes it via context; `SearchBar` calls `startNavigation()` instead of
// `router.push()` directly, and `ResultsPending` swaps to a skeleton while
// pending, back to real content once ready.
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

// Returns `null` outside a `ResultsPageShell` (e.g. the homepage search bar
// in "home" mode) — callers should fall back to a plain `router.push()`.
export function useResultsTransition() {
  return useContext(ResultsTransitionContext);
}

// Wraps the results area, swapping `children` for `skeleton` while a
// tracked navigation is pending. Renders `children` as-is outside a
// `ResultsPageShell`.
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
