"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";

// Cross-fades between routes so navigation doesn't feel like an instant swap.
//
// Lives in app/layout.tsx wrapping `{children}`, not template.tsx — Next.js
// swaps in the new page's DOM before AnimatePresence could play an exit
// animation there. Keying on pathname here lets AnimatePresence treat the
// old page as leaving and animate it out first.
//
// Only `opacity` animates, not `y`/scale — a `transform` on an ancestor of
// a `position: fixed` element changes what that element is positioned
// relative to, which would break every page's fixed Navbar.
//
// `mode="wait"` avoids briefly overlapping two full pages (two Navbars,
// two Footers) mid-transition, at the cost of a very brief blank moment.
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
