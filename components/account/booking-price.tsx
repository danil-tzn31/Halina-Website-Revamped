"use client";

import { useCurrency } from "@/lib/currency/currency-context";

// useCurrency() needs a Client Component; this is the smallest wrapper
// that lets a Server Component page render a formatted price.
export function BookingPrice({ amount, currency }: { amount: number; currency: string }) {
  const { formatPrice } = useCurrency();
  return <>{formatPrice(amount, currency)}</>;
}
