"use client";

import { useEffect } from "react";

import { forgetPendingCheckout } from "@/components/booking/checkout-abandon-watcher";

// Client-only piece of app/booking/success/page.tsx (a Server Component).
// Clears the "checkout in progress" flag now that payment succeeded — not
// strictly required (the cancel route no-ops on a non-PENDING booking),
// just tidiness.
export function ClearPendingCheckout() {
  useEffect(() => {
    forgetPendingCheckout();
  }, []);

  return null;
}
