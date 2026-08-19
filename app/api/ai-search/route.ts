import { NextResponse } from "next/server";

import { extractTripPreferences } from "@/lib/ai/trip-search";
import { aiSearchSchema } from "@/lib/validators/ai-search";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Turns a free-text query into the same vibe/budget/group answers a
// visitor could pick by hand via trip-finder-modal.tsx's quick-select
// buttons, using Gemini to extract them from a sentence. Also pulls out a
// best-effort date and traveler count.
//
// Returns the raw extracted answers rather than pre-computed destination
// matches — matching happens client-side in trip-finder-modal.tsx once
// the visitor has seen (and possibly corrected) the AI's guess, so we
// don't waste a match computation on an answer that's about to change.
export async function POST(request: Request) {
  // Public, unauthenticated route calling a metered third-party API —
  // worth rate limiting. Reuses the same in-memory limiter as login/signup.
  // 10/min/IP is generous for a real visitor, tight enough to stop a
  // script from burning through Gemini's free-tier quota.
  const ipLimit = checkRateLimit(`ai-search:ip:${getClientIp(request)}`, {
    max: 10,
    windowMs: 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = aiSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const preferences = await extractTripPreferences(parsed.data.query);

  // null means Gemini failed, timed out, or returned something untrustworthy
  // — return a normal 200 (not an error) since this is an expected, handled
  // outcome, not a failure. The UI just leaves the quick-select buttons
  // unselected, same as if the visitor never typed anything.
  if (!preferences) {
    return NextResponse.json({
      understood: false,
      vibe: null,
      budget: null,
      group: null,
      date: null,
      travelers: null,
    });
  }

  // Already validated inside extractTripPreferences — trusted as-is here.
  return NextResponse.json({
    understood: true,
    vibe: preferences.vibe,
    budget: preferences.budget,
    group: preferences.group,
    date: preferences.date,
    travelers: preferences.travelers,
  });
}
