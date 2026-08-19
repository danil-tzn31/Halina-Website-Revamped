"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PRELOAD_HOLD_MS, usePageReady } from "@/lib/use-page-ready";

// PRELOAD_HOLD_MS (lib/use-page-ready.ts) is the minimum time the preloader
// stays up before it can fade out, giving the progress bar room to fill.
// It lives there rather than as a local constant so Hero can import the
// same value and start its entrance animation the moment this fades out.
//
// usePageReady waits for whichever is longer: real page load or this
// minimum hold. useReducedMotion skips the animation — and the hold —
// entirely for reduced-motion users.
export function Preloader() {
  const prefersReducedMotion = useReducedMotion();
  const ready = usePageReady(prefersReducedMotion ? 0 : PRELOAD_HOLD_MS);
  const visible = !ready;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
        >
          <div className="text-center">
            {/* font-semibold matches the navbar wordmark (navbar.tsx).
                Previously font-extralight, too thin to read clearly at
                this size against the dark background. */}
            <motion.div
              className="pl-2 text-[15px] font-semibold uppercase text-paper"
              style={{ letterSpacing: "0.5em" }}
              initial={{ opacity: 0, letterSpacing: "0.8em" }}
              animate={{ opacity: 1, letterSpacing: "0.5em" }}
              transition={{
                duration: prefersReducedMotion ? 0 : 1.0,
                delay: prefersReducedMotion ? 0 : 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              Halina
            </motion.div>
            {/* Fill animates 0-100% over 1.4s, finishing just before the
                1.5s hold (PRELOAD_HOLD_MS) ends, so it reads as "done" right
                before the page reveals itself. */}
            <div className="mx-auto mt-4 h-[3px] w-40 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full rounded-full bg-sand-light"
                initial={{ width: prefersReducedMotion ? "100%" : "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 1.2,
                  delay: prefersReducedMotion ? 0 : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
