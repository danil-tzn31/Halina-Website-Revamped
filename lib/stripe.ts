import Stripe from "stripe";

// Lazy singleton. `new Stripe(secretKey)` throws immediately if the key is
// undefined, so constructing it at module-load time would break any import
// of this file before STRIPE_SECRET_KEY is set, even for unrelated requests.
// Only the checkout and webhook routes import this file, and even they
// don't pay the construction cost until getStripe() is actually called.
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
// for USD, centavos for PHP), except for a short list of "zero-decimal"
// currencies with no subunit, where the amount is passed as-is. Bookings
// here are only ever USD or PHP, neither zero-decimal, but handling this
// properly is cheap and avoids silently overcharging 100x if that changes.
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
