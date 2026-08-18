"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

import { useAuthModal } from "@/lib/auth-modal-context";
import { cn } from "@/lib/utils";
import { CurrencyPicker } from "@/components/layout/currency-picker";

// How far you need to scroll before the nav switches from transparent to
// solid. Small on purpose (a couple of lines of body text) — the point is
// "as soon as you've moved past the very top of the page," not requiring a
// full scroll past the hero photo first.
const SCROLL_THRESHOLD = 24;

// The nav is `fixed` — it floats over the page and never takes up its own
// layout space, on every page, not just the homepage. Two variants control
// what it looks like at the very top of the page, before any scrolling:
// "overlay" (light text, transparent background — for pages that open on a
// full-bleed photo, like the homepage hero or a destination page) and
// "solid" (dark text — for pages that open directly on the plain paper
// background, like My Bookings). Once you scroll past SCROLL_THRESHOLD,
// the nav always switches to the same solid look regardless of which
// variant it started as — see HOW-IT-WORKS.md for the full reasoning.
//
// Because this is now `fixed` instead of sitting in the normal document
// flow, every page that renders it needs to reserve the equivalent space
// itself if its content isn't meant to sit *under* a photo — see the
// `pt-*` classes added to each non-hero page's `<main>` alongside this
// change (a photo-hero page needs no such padding, since the nav is
// supposed to float transparently over the photo exactly like before).
export function Navbar({
  variant = "solid",
}: {
  variant?: "overlay" | "solid";
}) {
  const { data: session, status } = useSession();
  const { openModal } = useAuthModal();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showLight = variant === "overlay" && !scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-line bg-paper/90 backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <nav className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-5 sm:px-10">
        {/* `showLight` text gets a soft drop shadow on top of its own
            opacity/color — a hero photo's brightness varies by crop and by
            which specific photo is in play (this one has a light, hazy sky
            band right where the nav sits), so opacity and color alone can't
            guarantee contrast against every possible pixel behind it. A
            shadow that darkens whatever's immediately behind the letterforms
            works regardless of the photo's own brightness at that spot —
            the same reason a photo caption or a video's subtitles almost
            always carry a shadow instead of relying on a matched-brightness
            background. Bumped from /75 to /90 base opacity at the same
            time — the shadow alone helps most against a light patch of
            photo, but the extra opacity keeps the *hover-to-full-white*
            transition from being disproportionately large. */}
        {/* The one deliberately-chosen spot for Semibold (600) in the
            whole site — the wordmark is about as "essential" as text
            gets, and it's short and never italicized, so there's no
            synthetic-bold or synthetic-italic risk here the way there
            would be applying this weight more broadly. See app/layout.tsx
            for the full reasoning on why this stays rare rather than
            becoming a general-purpose emphasis tool. */}
        <Link
          href="/"
          className={cn(
            "text-[15px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300",
            showLight
              ? "text-paper [text-shadow:0_1px_4px_rgb(0_0_0/45%)]"
              : "text-ink"
          )}
        >
          Halina
        </Link>
        <ul className="flex items-center gap-9">
          <li>
            <CurrencyPicker isOverlay={showLight} />
          </li>
          <li>
            <Link
              href="/account/bookings"
              className={cn(
                "group relative text-[13px] tracking-wide transition-colors duration-300",
                showLight
                  ? "text-paper/90 [text-shadow:0_1px_4px_rgb(0_0_0/45%)] hover:text-paper"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              My Bookings
              <span
                className={cn(
                  "absolute -bottom-1.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full",
                  showLight ? "bg-paper" : "bg-ink"
                )}
              />
            </Link>
          </li>
          {/* Only rendered for an admin session — a regular account never
              even sees this link exists, rather than seeing it and
              hitting a redirect if they click it. The actual security
              boundary is server-side (app/account/admin/page.tsx's own
              isAdmin check, and the API route it calls re-checking the
              same flag) — this is just not showing the door to everyone
              who isn't allowed through it. */}
          {session?.user?.isAdmin && (
            <li>
              <Link
                href="/account/admin"
                className={cn(
                  "group relative text-[13px] tracking-wide transition-colors duration-300",
                  showLight
                    ? "text-paper/90 [text-shadow:0_1px_4px_rgb(0_0_0/45%)] hover:text-paper"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                Admin
                <span
                  className={cn(
                    "absolute -bottom-1.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full",
                    showLight ? "bg-paper" : "bg-ink"
                  )}
                />
              </Link>
            </li>
          )}
          {/* The session always carried a name/email (lib/auth.ts sets both
              at login) but nothing ever displayed them — there was no way
              to tell which account you were signed in as short of logging
              out and checking. First name only, not the full name or
              email: this is a quiet identity check, not a profile display,
              so it should read as calm as the rest of the nav rather than
              competing with "My Bookings"/"Admin" for attention. Not a
              link — it's not clickable, just a label — so it deliberately
              skips the hover-underline treatment every actual nav link
              gets here, the one visual cue that tells you something is
              interactive. Falls back to the full name (or nothing, via
              `??`) if a session somehow has no space-separated first
              token, though in practice authorize() in lib/auth.ts always
              sets name to "firstName lastName". */}
          {status === "authenticated" && session?.user?.name && (
            <li
              className={cn(
                "text-[13px] tracking-wide",
                showLight
                  ? "text-paper/70 [text-shadow:0_1px_4px_rgb(0_0_0/45%)]"
                  : "text-ink-soft/70"
              )}
            >
              {session.user.name.split(" ")[0] ?? session.user.name}
            </li>
          )}
          <li>
            {status === "authenticated" ? (
              <button
                type="button"
                onClick={() => signOut()}
                className={cn(
                  "text-[13px] tracking-wide transition-colors duration-300",
                  showLight
                    ? "text-paper/90 [text-shadow:0_1px_4px_rgb(0_0_0/45%)] hover:text-paper"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                Log out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openModal("login")}
                className={cn(
                  "text-[13px] tracking-wide transition-colors duration-300",
                  showLight
                    ? "text-paper/90 [text-shadow:0_1px_4px_rgb(0_0_0/45%)] hover:text-paper"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                Log in
              </button>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}
