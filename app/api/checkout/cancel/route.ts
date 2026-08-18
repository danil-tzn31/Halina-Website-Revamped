import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Stripe redirects here (a plain browser GET, not an API call your own code
// makes) when someone backs out of Checkout without paying — see
// cancel_url in app/api/checkout/route.ts. Before this route existed,
// cancel_url pointed straight at /account/bookings, which meant an
// abandoned checkout left its booking sitting there forever as "pending"
// (see HOW-IT-WORKS.md for the full story of that bug — reported directly
// by testing the cancel path, not something this sandbox could catch on
// its own since it has no real Stripe account to abandon a payment with).
//
// This route's only job is to flip that one booking from PENDING to
// CANCELLED before sending the browser on to My Bookings, so "didn't pay"
// actually means "doesn't show up as a booking" — matching the same
// principle as the webhook: a booking's status only ever changes here, in
// one obvious place, never implicitly.
//
// Two different callers hit this route now, hence the `redirect` param.
// Stripe itself calls it as a full-page navigation (cancel_url) when
// someone clicks Stripe's own "Back" link — that caller wants the normal
// redirect-to-My-Bookings behavior. components/booking/checkout-abandon-
// watcher.tsx calls it as a background `fetch()` when it detects the
// *browser's own* back button was used instead (a case Stripe's cancel_url
// never sees at all) — that caller doesn't want or need a redirect, it's
// just firing the same cleanup from a page that's already showing.
export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get("bookingId");
  const skipRedirect = req.nextUrl.searchParams.get("redirect") === "0";
  const session = await auth();

  if (bookingId && session?.user?.id) {
    const { prisma } = await import("@/lib/prisma");
    // updateMany (not update) guarded by status: "PENDING" — same
    // idempotency reasoning as the webhook's write: if this route somehow
    // ran twice, or the booking already got marked PAID by a webhook that
    // arrived first (a genuine race — the person could have actually
    // completed payment right as they also hit "back"), this is a safe
    // no-op rather than overwriting a status something else already set
    // correctly.
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
