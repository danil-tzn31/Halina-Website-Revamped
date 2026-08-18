"use client";

import { useEffect } from "react";

import { forgetPendingCheckout } from "@/components/booking/checkout-abandon-watcher";

// Tiny client-only piece of app/booking/success/page.tsx (itself a Server
// Component, which can't call sessionStorage directly). Clears the
// "checkout in progress" flag checkout-abandon-watcher.tsx relies on, now
// that payment actually succeeded — see that file's comment for the full
// reasoning. Not strictly required for correctness (the cancel route it
// would otherwise trigger later only ever touches a still-PENDING booking,
// so a stale flag can't wrongly cancel this now-paid one), just tidiness.
export function ClearPendingCheckout() {
  useEffect(() => {
    forgetPendingCheckout();
  }, []);

  return null;
}
