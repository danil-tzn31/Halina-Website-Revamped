"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

import { useAuthModal } from "@/lib/auth-modal-context";
import { cn } from "@/lib/utils";
import { CurrencyPicker } from "@/components/layout/currency-picker";

// Scroll distance before the nav switches from transparent to solid. Small
// on purpose — just past the very top of the page, not a full scroll past
// the hero photo.
const SCROLL_THRESHOLD = 24;

// Fixed nav, floats over every page. "overlay" (light text, transparent
// background) is for pages that open on a full-bleed photo; "solid" (dark
// text) is for plain-background pages. Both switch to solid once scrolled
// past SCROLL_THRESHOLD.
//
// Since this sits outside normal document flow, non-hero pages need their
// own top padding (`pt-*` on `<main>`) so content doesn't sit under it.
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
        {/* Drop shadow on `showLight` text keeps it legible regardless of
            the hero photo's brightness at that spot — opacity/color alone
            can't guarantee contrast against every possible crop. */}
        {/* Only spot using Semibold (600) on the site — short, never
            italicized text, so no synthetic-bold/italic risk. */}
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
          {/* Hides the link for non-admins; the real check is server-side
              (isAdmin check in the admin page and its API route). */}
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
          {/* First name only, not a link — a quiet identity check rather
              than a profile display, so it skips the hover-underline the
              real nav links get. Falls back to the full name if there's no
              space in it. */}
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
