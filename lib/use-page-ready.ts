"use client";

import { useEffect, useState } from "react";

// Shared by Preloader (fades itself out) and Hero (starts its entrance
// animation), so both key off the same signal. Without this, Hero could
// finish its reveal while still hidden behind the opaque Preloader overlay,
// so nobody would ever see it move.
//
// Waits for the page's `load` event *and* a minimum display time, whichever
// is longer, so a fast connection never flashes and a slow one never feels
// like it's hanging.
//
// PRELOAD_HOLD_MS is exported so both components read the same value —
// two independently hardcoded copies previously drifted out of sync when
// only one got updated, leaving Hero's animation finishing invisibly behind
// the still-opaque Preloader.
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
