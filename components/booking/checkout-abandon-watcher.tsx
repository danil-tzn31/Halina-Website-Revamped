"use client";

import { useEffect } from "react";

// Solves a real gap in app/api/checkout/cancel/route.ts: that route only
// ever runs if Stripe redirects the browser to cancel_url, which only
// happens when someone clicks Stripe's own "Back" link at the top of its
// Checkout page. If they instead use their browser's own back
// button/gesture, the browser just pops back to the previous entry in its
// history — often served straight from the "back-forward cache" (bfcache)
// — and never makes a request to this app's server at all. cancel_url is
// never hit, so the PENDING booking created just before the Stripe redirect
// is left sitting there indefinitely. Reported directly by testing that
// exact action (browser back, not Stripe's own back link) — not something
// this sandbox's own testing could have caught, since simulating "the user
// used their browser's native back button, not a link on the page" isn't
// something Playwright-style page-content testing exercises.
//
// The fix has to be client-side, since a native back navigation is
// something only the browser itself knows happened — nothing about it is
// visible to a server. The `pageshow` event with `event.persisted === true`
// is the standard way to detect exactly this: "this page was just restored
// from bfcache," which is what happens when someone leaves for an external
// site (Stripe) and then navigates back, rather than a fresh page load.
//
// This component is mounted once, in the root layout, so it's present on
// every page a booking modal could be open on (home, /flights, /hotels) —
// not just one specific page — since the page someone lands back on after
// hitting "back" is whichever page they started checkout from, not a fixed
// route.
const STORAGE_KEY = "halina:pendingCheckoutBookingId";

export function CheckoutAbandonWatcher() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;

      const bookingId = sessionStorage.getItem(STORAGE_KEY);
      if (!bookingId) return;

      // Same route Stripe's own cancel_url uses — it's already idempotent
      // (only touches the booking if it's still PENDING), so firing this
      // here is safe even in the rare case Stripe's webhook or cancel_url
      // already handled this exact booking first.
      fetch(`/api/checkout/cancel?bookingId=${encodeURIComponent(bookingId)}&redirect=0`).catch(() => {
        // Nothing useful to do with a failure here — worst case, the
        // booking stays PENDING, which is the exact pre-existing gap this
        // component exists to shrink, not a new failure mode it introduces.
      });
      sessionStorage.removeItem(STORAGE_KEY);
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}

// Called by the booking modals right before redirecting to Stripe, so this
// watcher knows which booking to clean up if the visitor comes back via
// their browser's native back action instead of Stripe's own link.
export function rememberPendingCheckout(bookingId: string) {
  sessionStorage.setItem(STORAGE_KEY, bookingId);
}

// Called on /booking/success once payment is confirmed, so a later,
// unrelated back-navigation doesn't fire an unnecessary (though harmless —
// the cancel route no-ops on a non-PENDING booking) cleanup call for a
// booking that already succeeded.
export function forgetPendingCheckout() {
  sessionStorage.removeItem(STORAGE_KEY);
}
