// A minimal in-memory rate limiter for the login and signup routes — stops
// casual abuse (a script hammering the login form, or spamming account
// creation) with a plain JS Map, no external service needed.
//
// Limitation: counts live in memory in this one process. Fine for a single
// instance, but serverless deployments (Vercel) can run several instances
// side by side, each with its own empty Map, so an attacker could get a
// fresh set of attempts by hitting a different instance. A real production
// fix is a shared external store (e.g. Upstash Redis).
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  // No bucket yet, or the window expired — start fresh instead of rejecting.
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= max) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// Called after a successful login so earlier typos don't count against the
// account owner's next attempt in the same window.
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

// Vercel (and most reverse proxies) set x-forwarded-for to a comma-separated
// list of IPs — real visitor first, then one entry per proxy hop — so the
// first entry is the one to trust. Absent in local dev (no proxy), so
// requests from your own machine just share one bucket while testing.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "local";
}
