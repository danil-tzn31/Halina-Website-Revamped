"use client";

import { useCurrency } from "@/lib/currency/currency-context";

// app/account/bookings/page.tsx is a Server Component (it reads straight
// from the database) and useCurrency() needs a Client Component to call
// from — this is the smallest possible wrapper to bridge the two, same
// idea as pulling one interactive piece out of an otherwise-static page
// rather than converting the whole page to a Client Component just for
// one price label.
export function BookingPrice({ amount, currency }: { amount: number; currency: string }) {
  const { formatPrice } = useCurrency();
  return <>{formatPrice(amount, currency)}</>;
}
