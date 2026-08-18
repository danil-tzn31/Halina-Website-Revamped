import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

// This is the *only* place a booking actually gets marked PAID — never
// app/api/checkout/route.ts, and never anything running in the browser.
// The reason: a successful redirect back to /booking/success only proves
// the browser was sent there, not that the payment actually cleared (a
// card could still get declined after 3D Secure, a user could forge a
// visit to that URL directly, etc.). Stripe's webhook is a server-to-server
// call Stripe makes directly to us after it has actually confirmed the
// charge, which is why it's the trustworthy source of truth for "did this
// really get paid" — this mirrors the real reason production payment
// integrations always work this way, not just a Stripe-specific quirk.
//
// Runs on the default Node.js runtime (not Edge) — nothing here opts into
// Edge, and Stripe's SDK needs Node's crypto module for signature
// verification below.
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
      // Only ever moves PENDING -> PAID. A booking that's already PAID
      // (Stripe can and does redeliver the same event more than once — its
      // own docs say to handle events idempotently) or CANCELLED just
      // no-ops here rather than risk overwriting a status some other event
      // already set correctly.
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
