"use client";

import { useEffect, useState } from "react";

// Shared by Preloader (components/layout/preloader.tsx — decides when to
// fade itself out) and Hero (components/sections/hero.tsx — decides when to
// start its own entrance animation), so both key off the exact same signal.
// Without this, Hero's reveal animation could finish playing while still
// hidden behind the still-opaque Preloader (which sits on top of everything,
// `position: fixed inset-0 z-[999]`) — nobody would ever actually see it
// move, since by the time the Preloader faded away Hero would already be
// sitting in its final, fully-revealed state.
//
// Waits for the page's `load` event (images, fonts, everything) *and* a
// minimum display time, whichever is longer — so a fast connection never
// flashes, and a slow one never feels like it's hanging past what's
// intentional. This logic used to live only inside Preloader; pulling it out
// here is what lets Hero start its own animation at the exact same moment
// Preloader starts fading, rather than guessing at a delay.
//
// PRELOAD_HOLD_MS is the actual number both components pass in. It used to
// be two separate hardcoded literals — one in each file, with a comment in
// each saying "this matches the other one" — which is exactly the kind of
// setup that silently breaks the moment only one of the two gets edited.
// That's not hypothetical: it's precisely what happened when the Preloader's
// own hold time was bumped from 700ms to 1500ms (to give its progress bar
// room to fill) without Hero's separate 700 being updated to match. Hero's
// entrance animation kept gating on the old, shorter value, so on a normal
// load it finished playing a full 800ms before the Preloader (now running
// longer) actually faded away — invisibly, behind the still-opaque overlay,
// with nothing left to animate by the time anyone could see it. One shared
// exported constant instead of two independently-edited copies makes that
// class of bug structurally impossible going forward, rather than just
// fixed for now.
export const PRELOAD_HOLD_MS = 1500;

export function usePageReady(minDisplayMs: number) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const minDisplay = new Promise<void>((resolve) =>
      setTimeout(resolve, minDisplayMs)
    );
    const pageLoad =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) =>
            window.addEventListener("load", () => resolve(), { once: true })
          );

    Promise.all([minDisplay, pageLoad]).then(() => setReady(true));
  }, [minDisplayMs]);

  return ready;
}
