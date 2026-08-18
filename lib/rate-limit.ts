// A minimal in-memory rate limiter for the login and signup routes — see
// HOW-IT-WORKS.md for the full writeup, but the short version: this stops
// casual abuse (a script hammering the login form, or spamming account
// creation) using nothing but a plain JS Map, so it needs no new service,
// account, or env var to work.
//
// The honest limitation, worth knowing before relying on this anywhere
// real: the counts below live in memory, in this one running process. That
// works correctly for a local dev server and for a small, single-instance
// deployment, but a production app on serverless infrastructure (like
// Vercel) can run several separate instances of this same code side by
// side, each with its own empty Map — so a determined attacker could get a
// fresh set of attempts just by getting routed to a different instance.
// The real production fix is a shared external store every instance reads
// from, most commonly Upstash Redis (a serverless-friendly Redis with a
// free tier, paired with its `@upstash/ratelimit` package) — noted as a
// natural backlog item in the revamp plan rather than pulled in now, since
// it needs its own account/setup step and isn't necessary for this
// project's actual scope.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  // No bucket yet, or the old one's window has already expired — start a
  // fresh count of 1 (this attempt) rather than rejecting it.
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

// Called after a genuinely successful login (see lib/auth.ts) so a couple
// of earlier typos don't count against the account owner's next attempt
// later in the same window — only a wrong password should ever build up
// toward the limit, not a correct one.
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

// Vercel (and most reverse proxies in front of Node apps) set
// x-forwarded-for to a comma-separated list of IPs — the real visitor
// first, then one entry per proxy hop after that — so the first entry is
// the one worth trusting here. Running `next dev` locally has no proxy in
// front of it at all, so this header is simply absent there; falling back
// to a constant just means every request from your own machine shares one
// bucket while testing, which is fine for local use and never the
// situation on a real deployment.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "local";
}
