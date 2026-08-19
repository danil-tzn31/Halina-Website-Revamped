import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

// The only place a booking gets marked PAID — never checkout/route.ts,
// never the browser. A redirect to /booking/success only proves the
// browser got there, not that the charge cleared (declined card after
// 3DS, forged visit to the URL, etc). Stripe's webhook is a
// server-to-server call made only after the charge is confirmed, so it's
// the actual source of truth.
//
// Runs on the default Node.js runtime — Stripe's SDK needs Node's crypto
// module for the signature verification below.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 }
    );
  }

  // Signature verification needs the exact raw bytes Stripe sent — not a
  // JSON.parse()'d and re-stringified copy, which can differ byte-for-byte
  // (key order, whitespace) even when it "means" the same thing. Next's App
  // Router route handlers don't auto-parse the body the way the old Pages
  // API did, so req.text() already gives us the untouched raw string.
  const rawBody = await req.text();

  let stripe: Stripe;
  let event: Stripe.Event;
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe webhook] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const bookingId = checkoutSession.metadata?.bookingId;

    if (bookingId) {
      const { prisma } = await import("@/lib/prisma");
      // Only ever moves PENDING -> PAID. Stripe redelivers events, so an
      // already-PAID or CANCELLED booking just no-ops instead of risking
      // an overwrite.
      await prisma.booking.updateMany({
        where: { id: bookingId, status: "PENDING" },
        data: { status: "PAID", stripeSessionId: checkoutSession.id },
      });
    } else {
      // Shouldn't happen — app/api/checkout/route.ts always sets this
      // metadata field — but a missing bookingId shouldn't crash the
      // webhook handler (Stripe retries on any non-2xx response, and
      // retrying forever won't make a missing field appear).
      console.error(
        "[stripe webhook] checkout.session.completed with no bookingId in metadata:",
        checkoutSession.id
      );
    }
  }

  // Any event type this handler doesn't branch on above is intentionally
  // ignored, not an error — Stripe sends many event types to a webhook
  // endpoint, and only checkout.session.completed matters for this app's
  // one payment flow. Returning 200 tells Stripe "received, don't retry."
  return NextResponse.json({ received: true });
}
