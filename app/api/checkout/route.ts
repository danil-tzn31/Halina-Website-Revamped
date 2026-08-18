import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getStripe, toStripeAmount } from "@/lib/stripe";

// Sits between "Confirm booking" (POST /api/bookings, which already exists
// and creates a PENDING row) and the booking actually being marked PAID.
// This route's only job is: given a booking that already exists and
// belongs to the caller, create a Stripe-hosted Checkout Session for it and
// hand back the URL to redirect the browser to. The actual "mark it paid"
// step happens later, asynchronously, in app/api/stripe/webhook/route.ts —
// this route never marks anything paid itself, since a client-side
// redirect happening doesn't mean the payment actually succeeded (someone
// could close the tab, decline the card, etc.). See that file's comment
// for why the webhook is the only source of truth for payment status.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You need to be logged in to check out." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : null;
  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking || booking.userId !== session.user.id) {
    // Same response for "doesn't exist" and "exists but isn't yours" —
    // no reason to let someone probe which booking IDs are real.
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.status !== "PENDING") {
    return NextResponse.json(
      { error: "This booking has already been paid or cancelled." },
      { status: 400 }
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      {
        error:
          "Payments aren't configured yet — STRIPE_SECRET_KEY is missing from .env.local.",
      },
      { status: 500 }
    );
  }

  const origin = req.nextUrl.origin;
  const price = Number(booking.price);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: booking.currency,
          unit_amount: toStripeAmount(price, booking.currency),
          product_data: {
            name: booking.name,
            description:
              booking.type === "FLIGHT"
                ? `Flight booking · ${booking.guests} ${booking.guests === 1 ? "passenger" : "passengers"}`
                : `Hotel booking · ${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}`,
          },
        },
      },
    ],
    // metadata travels with the session and is what the webhook uses to
    // find its way back to this exact booking row — see that file.
    metadata: { bookingId: booking.id },
    success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    // Routed through /api/checkout/cancel (not straight to /account/bookings)
    // so backing out of payment actually marks this booking CANCELLED
    // instead of leaving it sitting there PENDING forever — see that
    // route's comment for the full reasoning.
    cancel_url: `${origin}/api/checkout/cancel?bookingId=${booking.id}`,
  });

  // Recorded now, not only once the webhook fires, so /booking/success can
  // look this booking up by session ID the moment Stripe redirects back —
  // even if the webhook (a separate, async delivery) hasn't landed yet.
  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
