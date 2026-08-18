"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { Navbar } from "@/components/layout/navbar";
import { SearchBar } from "@/components/sections/search-bar";
import { HERO_PHOTO_URL } from "@/lib/photos";
import { PRELOAD_HOLD_MS, usePageReady } from "@/lib/use-page-ready";

// Hero photo: El Nido, Palawan — hotlinked from Unsplash (free license, no
// attribution required). See lib/photos.ts for the shared photo ID this
// is built from (also reused, cropped, as the site's social-preview
// image), next.config.ts for the remotePatterns entry that allows Next.js's
// image optimizer to process it, and HOW-IT-WORKS.md for why it's
// hotlinked rather than self-hosted.

// The entrance animation below (photo/gradient fade-in, then the eyebrow,
// headline, subtext, and search bar staggering in one after another) is
// gated on `usePageReady` (lib/use-page-ready.ts) — the exact same signal
// Preloader (components/layout/preloader.tsx) uses to decide when to fade
// itself out. Without that shared gate, this animation would just run on
// mount like any other Framer Motion entrance effect — which sounds right,
// but Preloader sits on top of everything (`position: fixed inset-0
// z-[999]`) while the page is still loading, so an animation that started
// on mount would finish playing *invisibly*, hidden behind the still-opaque
// Preloader, and by the time Preloader faded away this section would
// already be sitting in its fully-revealed end state — no motion anyone
// could actually see. Gating both on the same hook means Hero's reveal
// starts at the exact moment Preloader starts fading, so the two blend
// into one continuous effect: the black overlay dissolving away to reveal
// content that's already gently animating into place underneath it.
//
// This file has to be a Client Component ("use client" above) to use these
// hooks — a genuine, deliberate step up from before, when Hero was a plain
// Server Component. That's fine here: every prop Hero receives (initialTab,
// initialTo, etc.) is a plain string/number passed down from app/page.tsx's
// Server Component searchParams read, so nothing server-only is lost by the
// switch, and SearchBar (which Hero already rendered) was already a Client
// Component itself.
//
// Same easing curve Preloader's own heading animation uses (a fast-out,
// gentle-settle cubic-bezier) — reusing it here is what makes the two
// animations feel like one coordinated reveal instead of two unrelated
// effects that happen to run back to back.
const HERO_EASE = [0.16, 1, 0.3, 1] as const;

// Optional prefill values, threaded down from app/page.tsx's `searchParams`
// prop (a Server Component prop, not a client-side hook) — set either by
// app/destinations/[slug]/page.tsx's "Search flights/hotels here" links, or
// (as of section 42) by the AI trip search's own match links, both of
// which land on "/" with these in the query string. Passing them as plain
// props rather than having SearchBar call useSearchParams itself avoids
// needing a second Suspense boundary just for this — Home already reads
// searchParams server-side the same way app/flights/page.tsx does.
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
  // These five were added in section 42, alongside the AI trip search's
  // new "search flights/hotels here" links — SearchBar already accepted
  // all five as props (it needed them for its own "results" mode, section
  // 21), so no new plumbing was needed there, only here and in
  // app/page.tsx to actually pass real values through.
  initialDepart?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialGuests?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  // Imports the exact same PRELOAD_HOLD_MS Preloader uses (lib/use-page-
  // ready.ts), rather than a separate local number — see that constant's
  // own comment for why: this used to be its own hardcoded `700` here,
  // which quietly stopped matching Preloader's hold time the moment that
  // one got bumped to 1500ms for its progress bar, and nobody edited this
  // file to match. One shared import can't drift out of sync the same way.
  const ready = usePageReady(prefersReducedMotion ? 0 : PRELOAD_HOLD_MS);

  return (
    // No `overflow-hidden` here on purpose (it was here originally, as a
    // defensive default). The airport dropdown inside SearchBar renders as
    // an absolutely-positioned list below its input — and that input sits
    // near the bottom of this section, so an open dropdown extends past
    // this section's own bottom edge into the page content below it. An
    // `overflow: hidden` ancestor clips anything that would render outside
    // its box, including absolutely-positioned descendants, so it was
    // slicing the dropdown off exactly at the hero's bottom edge (you'd see
    // the first airport or two, then nothing). Nothing else in this section
    // relies on the clipping — the background photo and its gradient are
    // both `inset-0`, so they already match the section's box exactly —
    // so removing it fixes the dropdown with no other visible change.
    <section className="relative flex min-h-[88vh] flex-col">
      {/* Fades in (and settles from a slight zoom) once `ready` flips true,
          rather than being visible from the very first paint — a static
          photo would work fine too, but this is what gives the reveal a
          sense of depth instead of just the text popping in over an
          already-static background. */}
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
          warmth while guaranteeing contrast for the white text below.
          rgb(23 59 63) is --ink's own value (see app/globals.css) — kept as
          a literal here rather than var(--ink) because this needs to blend
          per-stop alpha values a plain CSS variable substitution can't
          express in one linear-gradient() call; updated by hand alongside
          the Day 6 color refresh so this doesn't quietly drift out of sync
          with the actual --ink token over time.
          Fades in alongside the photo above (same duration, no extra delay)
          so the two are never visible independently of each other — the
          photo never has a moment on screen without its contrast overlay. */}
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

        {/* The headline stays in a narrow `max-w-xl` column on purpose — a
            short line length is what makes large display text readable.
            The search bar has the opposite need: it's a form with 5-6
            fields that each need real room for their content (an airport
            name, a date, a counter), so it gets its own wider container
            instead of inheriting the headline's width. Sharing one
            max-w-xl wrapper between both used to force every search-bar
            field into a container only 576px wide regardless of how many
            fields the current tab/trip-type needed — comfortable for the
            homepage's short one-way case, but not for round trip's extra
            Return field, which is what made fields either clip their text
            (too-narrow floors) or spill outside the bar's own border
            (once those floors were widened to stop the clipping) — same
            root cause, two different-looking symptoms. */}
        <div className="mt-auto pb-16 pt-24">
          <div className="max-w-xl">
            {/* text-sand-light, not text-sand — text-sand is tuned for
                *light* backgrounds (badges, notices elsewhere on the site)
                and would be too dark to read against this dark photo
                gradient. Also bumped from 11.5px to 13px and loosened the
                letter-spacing (0.18em to 0.12em) — the combination of tiny
                size and very wide tracking was working against legibility
                even before the color problem.
                Below: the eyebrow, headline, and subtext each fade + rise
                in with their own small delay, one after another — a manual
                stagger (each element's own `delay` value spaced roughly
                0.13-0.15s apart) rather than Framer Motion's
                `staggerChildren` container/variants pattern, to match how
                Preloader (just above this component in the tree) already
                sequences its own two elements: explicit initial/animate/
                transition per element. One consistent pattern for "how this
                codebase writes an entrance animation," not two. */}
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

          {/* `key` here is load-bearing, not decoration — found the hard way
              while testing section 42's new "search flights/hotels here"
              links from the AI trip search modal. Those links can now be
              clicked while already sitting on "/" (the modal is a global,
              every-page bubble as of section 41), which Next.js treats as a
              same-route client-side transition rather than a fresh page
              load. React reuses SearchBar's existing component instance in
              that case, and `useState(initialAdults ?? 1)` — like every
              other `initial*` state in SearchBar — only reads its argument
              on that instance's *first* mount, so the new prefill values
              silently had no effect. The destination page's older prefill
              links (section 11) never hit this, since they always navigate
              from a *different* route to "/", which unmounts and remounts
              this whole tree anyway. Keying on the prefill values forces
              React to treat a changed set of values as a new instance,
              fixing same-route clicks without touching cross-route ones.

              The `motion.div` wrapper below exists only to give the search
              bar its own entrance-animation delay (last in the stagger,
              after the eyebrow/headline/subtext) without touching SearchBar
              itself — it carries no layout classes of its own, so it
              behaves exactly like SearchBar sitting directly in this flex
              column did before, just with one extra (unstyled) box around
              it. */}
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
