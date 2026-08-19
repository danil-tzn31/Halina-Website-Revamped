import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Stripe redirects here (cancel_url in app/api/checkout/route.ts) when
// someone backs out of Checkout without paying. Flips the booking from
// PENDING to CANCELLED before sending the browser to My Bookings, so
// "didn't pay" means "doesn't show up as a booking" — same principle as
// the webhook: status only changes in one obvious place.
//
// Two callers, hence the `redirect` param: Stripe itself navigates here
// directly and wants the redirect; components/booking/checkout-abandon-
// watcher.tsx calls it as a background fetch when it detects the browser's
// own back button, and doesn't want one.
export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get("bookingId");
  const skipRedirect = req.nextUrl.searchParams.get("redirect") === "0";
  const session = await auth();

  if (bookingId && session?.user?.id) {
    const { prisma } = await import("@/lib/prisma");
    // updateMany + status: "PENDING" guard, same idempotency reasoning as
    // the webhook — a safe no-op if this runs twice or the booking was
    // already marked PAID by a webhook that arrived first.
    await prisma.booking.updateMany({
      where: { id: bookingId, userId: session.user.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  }

  if (skipRedirect) {
    return NextResponse.json({ ok: true });
  }

  // Redirect either way — someone backing out of a payment shouldn't see
  // an error page, whether or not there was anything to clean up.
  return NextResponse.redirect(new URL("/account/bookings", req.nextUrl.origin));
}
