"use client";

import { useEffect } from "react";

// Handles a gap in /api/checkout/cancel: that route only runs if Stripe
// redirects to cancel_url (its own "Back" link). Using the browser's
// native back button instead restores the page from bfcache without ever
// hitting the server, leaving the PENDING booking stuck.
//
// `pageshow` with `event.persisted` detects exactly that restore. Client-
// side only, since a native back navigation isn't visible to the server.
// Mounted once in the root layout since checkout can start from any page.
const STORAGE_KEY = "halina:pendingCheckoutBookingId";

export function CheckoutAbandonWatcher() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;

      const bookingId = sessionStorage.getItem(STORAGE_KEY);
      if (!bookingId) return;

      // Same route Stripe's cancel_url uses; idempotent (only touches a
      // still-PENDING booking), so safe to call even if already handled.
      fetch(`/api/checkout/cancel?bookingId=${encodeURIComponent(bookingId)}&redirect=0`).catch(() => {
        // Nothing to do on failure — worst case the booking stays PENDING.
      });
      sessionStorage.removeItem(STORAGE_KEY);
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}

// Called right before redirecting to Stripe, so this watcher knows which
// booking to clean up on a native back navigation.
export function rememberPendingCheckout(bookingId: string) {
  sessionStorage.setItem(STORAGE_KEY, bookingId);
}

// Called on /booking/success once payment is confirmed, so a later
// back-navigation doesn't fire a needless (if harmless) cleanup call.
export function forgetPendingCheckout() {
  sessionStorage.removeItem(STORAGE_KEY);
}
