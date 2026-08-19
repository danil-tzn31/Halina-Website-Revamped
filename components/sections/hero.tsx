"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { Navbar } from "@/components/layout/navbar";
import { SearchBar } from "@/components/sections/search-bar";
import { HERO_PHOTO_URL } from "@/lib/photos";
import { PRELOAD_HOLD_MS, usePageReady } from "@/lib/use-page-ready";

// Hero photo: El Nido, Palawan — hotlinked from Unsplash (free license, no
// attribution required). See lib/photos.ts for the shared photo ID (also
// used, cropped, as the social-preview image) and next.config.ts for the
// remotePatterns entry that allows it through Next's image optimizer.

// Entrance animation (photo/gradient fade-in, then eyebrow/headline/
// subtext/search bar staggering in) is gated on `usePageReady` — the same
// signal Preloader uses to fade itself out. Without that shared gate the
// animation would run on mount while still hidden behind Preloader
// (`z-[999]`) and finish invisibly. Gating both on the same hook makes the
// preloader's fade-out and this reveal blend into one continuous effect.
//
// Same easing curve as Preloader's heading animation, for the same reason.
const HERO_EASE = [0.16, 1, 0.3, 1] as const;

// Optional prefill values threaded down from app/page.tsx's `searchParams`
// — set by destination-page and trip-search links that land on "/" with
// these in the query string. Passed as props rather than SearchBar calling
// useSearchParams itself, since Home already reads searchParams server-side.
export function Hero({
  initialTab,
  initialTo,
  initialDestination,
  initialDepart,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialGuests,
}: {
  initialTab?: "flights" | "hotels";
  initialTo?: string;
  initialDestination?: string;
  // Mirrors the prefill props SearchBar already accepts for its "results"
  // mode.
  initialDepart?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialGuests?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  // Shares Preloader's own PRELOAD_HOLD_MS instead of a duplicated local
  // constant, so the two can't drift out of sync.
  const ready = usePageReady(prefersReducedMotion ? 0 : PRELOAD_HOLD_MS);

  return (
    // No `overflow-hidden`: SearchBar's airport dropdown is absolutely
    // positioned and extends past this section's bottom edge — an
    // overflow-hidden ancestor would clip it.
    <section className="relative flex min-h-[88vh] flex-col">
      {/* Fades in and settles from a slight zoom once `ready` flips true,
          for some depth instead of text popping in over a static photo. */}
      <motion.div
        className="absolute inset-0 -z-20"
        initial={{ opacity: 0, scale: 1.045 }}
        animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.045 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 1.5,
          ease: HERO_EASE,
        }}
      >
        <Image
          src={HERO_PHOTO_URL}
          alt="Limestone cliffs and turquoise lagoon in El Nido, Palawan"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      {/* Ink-tinted gradient, not a flat black scrim — keeps the photo's
          warmth while guaranteeing contrast for the text below. rgb(23 59
          63) is --ink's value (app/globals.css), written as a literal
          since per-stop alpha in linear-gradient() can't reference a CSS
          variable directly. Fades in alongside the photo, same duration,
          so neither is ever visible without the other. */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 1.5,
          ease: HERO_EASE,
        }}
        style={{
          background:
            "linear-gradient(180deg, rgb(23 59 63 / 0.15) 0%, rgb(23 59 63 / 0.35) 55%, rgb(23 59 63 / 0.82) 100%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-6 sm:px-10">
        <Navbar variant="overlay" />

        {/* Headline stays in a narrow `max-w-xl` column for readable line
            length. Search bar needs more room for its fields (especially
            round trip's extra Return field), so it gets its own wider
            container instead of inheriting the headline's width. */}
        <div className="mt-auto pb-16 pt-24">
          <div className="max-w-xl">
            {/* text-sand-light, not text-sand — text-sand is tuned for
                light backgrounds and reads too dark against this photo. */}
            {/* Eyebrow, headline, and subtext fade + rise in with staggered
                delays (~0.13-0.15s apart) via explicit initial/animate/
                transition per element, matching Preloader's pattern rather
                than Framer's staggerChildren. */}
            <motion.span
              className="mb-5 block text-[13px] uppercase tracking-[0.12em] text-sand-light"
              initial={{ opacity: 0, y: 14 }}
              animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.6,
                delay: prefersReducedMotion ? 0 : 0.15,
                ease: HERO_EASE,
              }}
            >
              Philippines, curated
            </motion.span>
            <motion.h1
              className="text-[2.75rem] font-light leading-[1.02] tracking-tight text-paper sm:text-6xl lg:text-[5.25rem]"
              initial={{ opacity: 0, y: 20 }}
              animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.75,
                delay: prefersReducedMotion ? 0 : 0.28,
                ease: HERO_EASE,
              }}
            >
              Travel that feels{" "}
              <em className="font-normal italic text-[#bfe3dc]">unhurried</em>,
              planned in minutes.
            </motion.h1>
            <motion.p
              className="mt-6 max-w-[38ch] text-[15.5px] leading-relaxed text-paper/80"
              initial={{ opacity: 0, y: 16 }}
              animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.65,
                delay: prefersReducedMotion ? 0 : 0.42,
                ease: HERO_EASE,
              }}
            >
              Flights, stays, and island escapes across the Philippines —
              searched, compared, and booked without the noise.
            </motion.p>
          </div>

          {/* `key` is load-bearing: the trip-search modal's "search here"
              links can navigate to "/" while already on it, which Next.js
              treats as a same-route transition that reuses SearchBar's
              instance — and its `initial*` state only reads props on first
              mount. Keying on the prefill values forces a fresh instance
              so same-route clicks still pick up new values.

              motion.div wrapper only exists to give the search bar its own
              stagger delay without adding layout classes to SearchBar
              itself. */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.65,
              delay: prefersReducedMotion ? 0 : 0.55,
              ease: HERO_EASE,
            }}
          >
            <SearchBar
              key={[initialTab, initialTo, initialDestination, initialDepart, initialCheckIn, initialCheckOut, initialAdults, initialGuests].join("|")}
              initialTab={initialTab}
              initialTo={initialTo}
              initialDestination={initialDestination}
              initialDepart={initialDepart}
              initialCheckIn={initialCheckIn}
              initialCheckOut={initialCheckOut}
              initialAdults={initialAdults}
              initialGuests={initialGuests}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
