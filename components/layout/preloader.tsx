"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PRELOAD_HOLD_MS, usePageReady } from "@/lib/use-page-ready";

// PRELOAD_HOLD_MS (lib/use-page-ready.ts) is the minimum time the preloader
// stays on screen before it's allowed to start fading away (it can still
// run longer than this if the real page load takes longer — see
// usePageReady below). It's a deliberate 1.5s so the progress bar below has
// room to actually fill up, rather than risking getting cut off by a fast
// page load. Combined with the 0.4s exit fade just below, a visitor sees
// roughly 1.9s of preloader on a normal connection — inside the "1.5-2
// seconds" window this was tuned for. It lives in use-page-ready.ts, not as
// a local constant here, specifically so Hero (components/sections/hero.tsx)
// imports the exact same value instead of keeping its own separately-edited
// copy — see that shared constant's own comment for the real bug this fixed.
//
// The "wait for page load or a minimum display time, whichever is longer"
// logic used to live directly in this component. It's now `usePageReady`
// (lib/use-page-ready.ts), shared with Hero — Hero's own entrance animation
// starts at the exact same moment this Preloader starts fading out, rather
// than guessing at a delay. See that hook's own comment for the full
// reasoning. `useReducedMotion` (from the modern-web-design / motion-framer
// guidance) skips the animation entirely for anyone who's asked their OS to
// reduce motion, rather than just making it faster — including skipping the
// 1.5s hold itself, so a reduced-motion visitor isn't forced to sit through
// a deliberately-lengthened wait purely for the sake of an animation they've
// asked not to see.
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
            {/* font-semibold (600) here matches the navbar's wordmark — see
                the comment on that Link in navbar.tsx, and the one above
                the font loader in app/layout.tsx, for the full reasoning.
                This used to be font-extralight (200, "Hairline"), which is
                exactly what it sounds like: thin, low-contrast strokes that
                are hard to read at this size against the dark background.
                Semibold was already the site's one deliberate "essential
                wordmark" exception, so bringing this one in line was more
                a matter of finishing that job than inventing a new rule. */}
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
            {/* A real progress bar — a track plus a separately-animated
                fill — rather than the plain growing-width line this used
                to be. The fill's width animates 0 to 100% and is timed to
                finish (1.4s) just before the hold ends (1.5s,
                PRELOAD_HOLD_MS, imported above), so it reads as "finished
                loading" right before the page reveals itself, rather than
                an arbitrary decorative line with no real relationship to
                the wait. */}
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
