import Stripe from "stripe";

// A lazy singleton, same idea as lib/prisma.ts's globalThis-cached client —
// except here the thing being deferred isn't a dev-reload duplicate
// connection, it's the constructor itself. `new Stripe(secretKey)` throws
// immediately if `secretKey` is undefined, so if this ran at module-load
// time (the top of the file, executed the instant anything imports this
// module), it would throw before STRIPE_SECRET_KEY is ever set — even for
// a request that has nothing to do with payments. This is the same "blast
// radius" lesson as lib/auth.ts's dynamic prisma import (see
// Halina-Revamp-Plan.md section 9): only the two routes that actually need
// Stripe (app/api/checkout/route.ts, app/api/stripe/webhook/route.ts)
// import this file at all, and even they don't pay the cost of
// constructing a client until getStripe() is actually called.
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — add it to .env.local (see .env.example)."
    );
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

// Stripe expects `unit_amount` in the smallest unit of the currency (cents
// for USD, centavos for PHP) — except for a short list of currencies Stripe
// treats as having no subunit at all ("zero-decimal" currencies), where the
// amount is passed as-is. This project's actual booking currencies are only
// ever USD or PHP (see Halina-Revamp-Plan.md section 19 — the currency
// picker only changes *display*, never what's recorded), neither of which
// is zero-decimal, so this list is more a correctness safeguard than
// something expected to trigger — but it's cheap to handle properly rather
// than hardcode "always multiply by 100" and have it silently overcharge by
// 100x if a zero-decimal currency ever does show up.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

export function toStripeAmount(amount: number, currency: string): number {
  const normalized = currency.toLowerCase();
  return ZERO_DECIMAL_CURRENCIES.has(normalized)
    ? Math.round(amount)
    : Math.round(amount * 100);
}
