"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";

// A brief cross-fade whenever the route changes, so moving between pages
// (home → flights, a destination → its detail page, and so on) doesn't feel
// like an instant, jarring swap.
//
// Two decisions here are worth explaining, because both are easy to get
// wrong in a way that looks fine in isolation and only breaks once you
// click around the real site:
//
// 1. This lives in app/layout.tsx, wrapping `{children}` — NOT in a
//    template.tsx. Next.js's App Router remounts template.tsx fresh on
//    every navigation, which sounds like the natural place for a
//    "per-page" animation. But that's exactly the problem: Next.js swaps
//    in the new page's DOM the moment navigation happens, before Motion's
//    AnimatePresence gets a chance to play the OLD page's exit animation —
//    there's nothing left to animate out. layout.tsx, by contrast, stays
//    mounted across navigations, so this AnimatePresence instance persists
//    too. Only its `key` (the current pathname) changes on navigation,
//    which is exactly the signal AnimatePresence needs to treat the old
//    page as "leaving" and animate it out before the new page enters.
//
// 2. Only `opacity` is animated here — deliberately not a `y` lift or
//    scale, unlike the card hover states (flight-result-card.tsx,
//    hotel-result-card.tsx). Every page in this app renders its own fixed-
//    position Navbar (components/layout/navbar.tsx — see the pt-[104px]
//    comments on each page for why). A `transform` on any ancestor of a
//    `position: fixed` element changes what that fixed element is
//    positioned relative to — instead of the browser viewport, it becomes
//    the transformed ancestor. Framer Motion animates `x`/`y`/`scale` via
//    the CSS `transform` property, so wrapping every page's content
//    (Navbar included) in a motion.div animating `y` would silently break
//    every page's "stays pinned while you scroll" Navbar behavior the
//    moment this component mounted. `opacity` doesn't have that side
//    effect — it's not one of the CSS properties that creates a new
//    containing block for fixed-position descendants — so a plain fade
//    gets the transition without quietly breaking navigation.
//
// `mode="wait"` (rather than the default, which overlaps enter/exit) is
// deliberate too: with the fade alone, overlapping the outgoing and
// incoming page would briefly show two full pages — two Navbars, two
// Footers — cross-faded on top of each other, which reads as a glitch
// rather than a transition. Waiting for the old page to finish fading out
// before the new one fades in avoids that, at the cost of a very brief
// (sub-quarter-second) blank moment in between, which is the right trade
// for a full-page cross-fade.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
